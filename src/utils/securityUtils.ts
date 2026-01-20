import CryptoJS from 'crypto-js';

// Secret key for AES encryption - sourced from environment variables
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'arc-web-location-default-key';

/**
 * Adds a random jitter to coordinates within a ~5KM radius.
 * 1 degree of latitude is ~111km.
 * 1 degree of longitude is ~111km * cos(latitude).
 */
export function addLocationJitter(lat: number, lng: number): { lat: number; lng: number } {
    const jitterKM = 5;
    const degLat = jitterKM / 111;
    const degLng = jitterKM / (111 * Math.cos(lat * (Math.PI / 180)));

    // Random offset between -jitter and +jitter
    const deltaLat = (Math.random() * 2 - 1) * degLat;
    const deltaLng = (Math.random() * 2 - 1) * degLng;

    return {
        lat: lat + deltaLat,
        lng: lng + deltaLng
    };
}

/**
 * Encrypts a coordinate object into a string.
 */
export function encryptLocation(location: { lat: number; lng: number }): string {
    const data = JSON.stringify(location);
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

/**
 * Decrypts a coordinate string back into an object.
 */
export function decryptLocation(encryptedData: string): { lat: number; lng: number } | null {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedData) return null;
        return JSON.parse(decryptedData);
    } catch (error) {
        console.error('Failed to decrypt location:', error);
        return null;
    }
}
