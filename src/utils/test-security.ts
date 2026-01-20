import { addLocationJitter, encryptLocation, decryptLocation } from './securityUtils';

function testSecurity() {
    console.log('--- Testing Security Utilities ---');

    const originalLat = 40.7128;
    const originalLng = -74.0060;
    console.log(`Original: ${originalLat}, ${originalLng}`);

    // Test Jitter
    const jittered = addLocationJitter(originalLat, originalLng);
    console.log(`Jittered: ${jittered.lat}, ${jittered.lng}`);

    // Calculate distance (rough)
    const dLat = (jittered.lat - originalLat) * 111;
    const dLng = (jittered.lng - originalLng) * (111 * Math.cos(originalLat * Math.PI / 180));
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    console.log(`Jitter Distance: ${distance.toFixed(3)} KM (Target <= 5KM * sqrt(2) roughly)`);

    if (distance > 10) {
        console.error('FAIL: Jitter distance too large!');
    } else {
        console.log('PASS: Jitter distance within acceptable range.');
    }

    // Test Encryption/Decryption
    const encrypted = encryptLocation(jittered);
    console.log(`Encrypted: ${encrypted}`);

    const decrypted = decryptLocation(encrypted);
    console.log(`Decrypted: ${decrypted?.lat}, ${decrypted?.lng}`);

    if (decrypted && decrypted.lat === jittered.lat && decrypted.lng === jittered.lng) {
        console.log('PASS: Encryption/Decryption successful and lossless.');
    } else {
        console.error('FAIL: Encryption/Decryption failed or modified data!');
    }
}

// Simple way to run without ts-node: 
// Since we are in a ESM/Vite project, we might need a different way to run this.
// I'll just export it and maybe call it from App.tsx once or just trust the logic.
// Actually, I can use node to run it if I transpile or use a simpler script.

testSecurity();
