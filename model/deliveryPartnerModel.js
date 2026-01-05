import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema(
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
        vehicleType: {
            type: String,
            required: [true, 'Vehicle type is required'],
            enum: ['Bike', 'Scooter', 'Car', 'Van', 'Truck'],
            default: 'Bike',
        },
        vehicleNumber: {
            type: String,
            required: [true, 'Vehicle number is required'],
            trim: true,
            uppercase: true,
        },
        licenseNumber: {
            type: String,
            required: [true, 'License number is required'],
            trim: true,
            unique: true,
            uppercase: true,
        },
        status: {
            type: String,
            enum: ['Available', 'Busy', 'Offline'],
            default: 'Offline',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        currentLocation: {
            lat: { type: Number },
            long: { type: Number },
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true,
        },
        fcmToken: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

export default DeliveryPartner;
