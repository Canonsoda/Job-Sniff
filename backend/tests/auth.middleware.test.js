/**
 * Tests for the authentication middleware.
 *
 * This is the highest-value thing to test in the codebase: it is the single
 * gate every protected route passes through, and its role-resolution logic is
 * what decides whether a request is treated as HR or applicant.
 *
 * Uses the Node built-in test runner (node --test), so there is no test
 * framework to install. User.findById is stubbed directly - the middleware
 * never needs a live MongoDB, and defining a Mongoose model does not require
 * a connection.
 *
 *   npm test
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-not-used-anywhere-real';

const { default: User } = await import('../models/user.model.js');
const { default: authMiddleware } = await import('../middleware/auth.middleware.js');

const realFindById = User.findById;

/** Minimal Express res double: records the status and JSON body. */
const mockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
};

const mockReq = (token) => ({
  headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
});

/** Make User.findById(...).select(...).lean() resolve to `doc` (or reject). */
const stubUser = (doc, { throws = false } = {}) => {
  User.findById = () => ({
    select: () => ({
      lean: async () => {
        if (throws) throw new Error('connection lost');
        return doc;
      },
    }),
  });
};

const sign = (payload, options = {}) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d', ...options });

/** Run the middleware and report whether it called next(). */
const run = async (req) => {
  const res = mockRes();
  let nextCalled = false;
  await authMiddleware(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
};

describe('authMiddleware', () => {
  beforeEach(() => stubUser({ role: 'applicant', name: 'Test', emailId: 't@example.com' }));
  afterEach(() => { User.findById = realFindById; });

  describe('rejects bad credentials', () => {
    test('401 when no Authorization header is present', async () => {
      const { res, nextCalled } = await run({ headers: {} });

      assert.equal(res.statusCode, 401);
      assert.equal(nextCalled, false);
    });

    test('403 when the signature does not verify', async () => {
      const forged = jwt.sign({ id: 'abc', role: 'hr' }, 'the-wrong-secret');
      const { res, nextCalled } = await run(mockReq(forged));

      assert.equal(res.statusCode, 403);
      assert.equal(nextCalled, false);
    });

    test('403 when the token has expired', async () => {
      const stale = sign({ id: 'abc', role: 'hr' }, { expiresIn: '-1s' });
      const { res, nextCalled } = await run(mockReq(stale));

      assert.equal(res.statusCode, 403);
      assert.equal(nextCalled, false);
    });

    test('403 when the token is not a JWT at all', async () => {
      const { res, nextCalled } = await run(mockReq('definitely-not-a-token'));

      assert.equal(res.statusCode, 403);
      assert.equal(nextCalled, false);
    });

    test('401 when the signed-in account no longer exists', async () => {
      stubUser(null);
      const { res, nextCalled } = await run(mockReq(sign({ id: 'deleted-user' })));

      assert.equal(res.statusCode, 401);
      assert.equal(nextCalled, false);
    });

    test('500, and no next(), when the user lookup fails', async () => {
      stubUser(null, { throws: true });
      const { res, nextCalled } = await run(mockReq(sign({ id: 'abc' })));

      assert.equal(res.statusCode, 500);
      assert.equal(nextCalled, false);
    });
  });

  describe('takes the role from the database, not the token', () => {
    // A JWT is a snapshot from login. These two cases are the reason the
    // middleware spends a lookup instead of trusting decoded.role.
    test('a token still claiming applicant is upgraded when the DB says hr', async () => {
      stubUser({ role: 'hr', name: 'Aryan', emailId: 'hr@example.com' });
      const req = mockReq(sign({ id: 'u1', role: 'applicant' }));

      const { res, nextCalled } = await run(req);

      assert.equal(nextCalled, true);
      assert.equal(res.statusCode, null, 'should not have sent a response');
      assert.equal(req.user.role, 'hr');
    });

    test('a token still claiming hr is downgraded when the DB says applicant', async () => {
      stubUser({ role: 'applicant', name: 'Aryan', emailId: 'a@example.com' });
      const req = mockReq(sign({ id: 'u1', role: 'hr' }));

      await run(req);

      assert.equal(req.user.role, 'applicant');
    });

    test('name and emailId also come from the database', async () => {
      stubUser({ role: 'hr', name: 'Current Name', emailId: 'current@example.com' });
      const req = mockReq(sign({ id: 'u1', name: 'Old Name', emailId: 'old@example.com' }));

      await run(req);

      assert.equal(req.user.name, 'Current Name');
      assert.equal(req.user.emailId, 'current@example.com');
    });
  });

  describe('fails closed on an unrecognised role', () => {
    // Authorization checks downstream read `role === 'applicant'`, so anything
    // that is not exactly 'hr' has to collapse to the least-privileged value.
    // If any of these leaked through as HR it would be a privilege escalation.
    for (const role of [null, undefined, '', 'both', 'HR', 'admin', 'Hr']) {
      test(`role ${JSON.stringify(role)} resolves to applicant`, async () => {
        stubUser({ role, name: 'Test', emailId: 't@example.com' });
        const req = mockReq(sign({ id: 'u1', role: 'hr' }));

        await run(req);

        assert.equal(req.user.role, 'applicant');
      });
    }

    test('only an exact "hr" grants HR', async () => {
      stubUser({ role: 'hr', name: 'Test', emailId: 't@example.com' });
      const req = mockReq(sign({ id: 'u1' }));

      await run(req);

      assert.equal(req.user.role, 'hr');
    });
  });

  test('the user id comes from the verified token payload', async () => {
    stubUser({ role: 'hr', name: 'Test', emailId: 't@example.com' });
    const req = mockReq(sign({ id: '507f1f77bcf86cd799439011' }));

    await run(req);

    assert.equal(req.user.id, '507f1f77bcf86cd799439011');
  });
});