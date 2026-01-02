import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
    isDefault: { type: Boolean, default: false }
});

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        addresses: [addressSchema],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
