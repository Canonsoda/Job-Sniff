import mongoose from 'mongoose'; 

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    emailId:{
        type: String,
        required: true,
        unique: true
    },
    phoneNumber: {
        type: String,
    },
    password: {
    type: String,
    required: function () {
        return !this.googleId;
    },
    },
    googleId: {
    type: String,
    },
    role: {
        type: String,
        enum: ['hr','applicant',null],
        default:null,
    },
    recruiterDetails: {
        companyName: String,
        jobTitle: String,
        phoneNumber: String,
        companyWebsite: String,
    },
},{ timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
