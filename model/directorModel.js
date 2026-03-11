import mongoose from 'mongoose';

const directorSchema = new mongoose.Schema({
    din: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    designation: {
        type: String,
        required: true,
        enum: ['Managing Director', 'Director', 'Independent Director', 'Additional Director'],
        default: 'Director',
    },
    appointed: {
        type: Date,
        required: true,
    },
    nationality: {
        type: String,
        default: 'Indian',
    },
    shareholding: {
        type: String,
        default: '0%',
    },
    status: {
        type: String,
        enum: ['Active', 'Resigned', 'Disqualified'],
        default: 'Active',
    }
}, { timestamps: true });

const Director = mongoose.model('Director', directorSchema);
export default Director;
