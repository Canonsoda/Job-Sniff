import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Star } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

const Searches = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [minCgpa, setMinCgpa] = useState(0);
  const [maxCgpa, setMaxCgpa] = useState(10);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");

  const handleSearch = async () => {
    if (!query.trim()) return toast.error("Please enter a search query.");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/resume/search`, {
        params: { query },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.results || [];
      setResults(data);
    } catch (err) {
      toast.error("Search failed");
    }
  };

  useEffect(() => {
    let filteredResults = results.filter((res) => {
      const cgpaNum = parseFloat(res.cgpa);
      const cgpaOk = cgpaNum >= minCgpa && cgpaNum <= maxCgpa;

      const skillOk =
        selectedSkills.length === 0 ||
        selectedSkills.every((skill) =>
          res.skills?.toLowerCase().includes(skill.toLowerCase())
        );

      return cgpaOk && skillOk;
    });

    if (sortOrder === "asc") {
      filteredResults.sort((a, b) => parseFloat(a.cgpa) - parseFloat(b.cgpa));
    } else {
      filteredResults.sort((a, b) => parseFloat(b.cgpa) - parseFloat(a.cgpa));
    }

    setFiltered(filteredResults);
  }, [results, minCgpa, maxCgpa, selectedSkills, sortOrder]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const toggleShortlist = async (id, newStatus, index) => {
    try {
      const token = localStorage.getItem("token");

      setFiltered((prev) =>
        prev.map((res, i) =>
          i === index ? { ...res, shortlistLoading: true } : res
        )
      );

      await axios.patch(
        `${import.meta.env.VITE_API_URL}/resume/${id}/shortlist`,
        { shortlisted: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(
        newStatus ? "Resume shortlisted!" : "Removed from shortlist"
      );

      setFiltered((prev) =>
        prev.map((res, i) =>
          i === index
            ? { ...res, shortlisted: newStatus, shortlistLoading: false }
            : res
        )
      );
    } catch (err) {
      toast.error("Failed to update shortlist");
      setFiltered((prev) =>
        prev.map((res, i) =>
          i === index ? { ...res, shortlistLoading: false } : res
        )
      );
    }
  };

  const allSkills = Array.from(
    new Set(
      results.flatMap((res) => res.skills?.split(",").map((s) => s.trim()) || [])
    )
  ).filter(Boolean);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Search className="text-teal-400" size={24} />
        <h1 className="text-2xl font-semibold text-white">Search Resumes</h1>
      </div>

      {/* Input Section */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="text"
          placeholder="Search by skill, degree, etc..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-4 py-2 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none"
        />
        <button
          onClick={handleSearch}
          className="px-5 py-2 bg-teal-600 hover:bg-teal-700 rounded-md text-white font-semibold"
        >
          Search
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CGPA Range */}
        <div className="bg-white/5 p-5 rounded-xl border border-white/10">
          <label className="text-gray-300 text-sm font-medium">CGPA Range</label>
          <div className="flex gap-3 mt-2">
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={minCgpa}
              onChange={(e) => setMinCgpa(parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white"
            />
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={maxCgpa}
              onChange={(e) => setMaxCgpa(parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white"
            />
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white/5 p-5 rounded-xl border border-white/10">
          <label className="text-gray-300 text-sm font-medium">Filter by Skills</label>
          {allSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {allSkills.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    selectedSkills.includes(skill)
                      ? "bg-teal-500 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-2">No skills to filter. Run a search first.</p>
          )}
        </div>

        {/* Sort by CGPA */}
        <div className="bg-white/5 p-5 rounded-xl border border-white/10">
          <label className="text-gray-300 text-sm font-medium">Sort by CGPA</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="mt-2 w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-md"
          >
            <option value="desc">High to Low</option>
            <option value="asc">Low to High</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((res, i) => (
            <motion.div
              key={res.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl space-y-3"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">{res.name}</h2>
                <button
                  disabled={res.shortlistLoading}
                  onClick={() => toggleShortlist(res.id, !res.shortlisted, i)}
                  className={`flex items-center gap-1 text-sm font-medium ${
                    res.shortlisted
                      ? "text-yellow-400"
                      : "text-teal-300 hover:text-teal-400"
                  }`}
                >
                  <Star size={16} />
                  {res.shortlisted ? "Shortlisted" : "Shortlist"}
                </button>
              </div>
              <p className="text-gray-300 text-sm">📧 {res.email}</p>
              <p className="text-gray-300 text-sm">📱 {res.phone}</p>
              <p className="text-gray-300 text-sm">🎓 CGPA: {res.cgpa}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {(res.skills || "")
                  .split(",")
                  .map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs"
                    >
                      {skill.trim()}
                    </span>
                  ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400 text-lg mt-10">
          No resumes match your filters. Try adjusting CGPA or skills.
        </p>
      )}
    </div>
  );
};

export default Searches;
