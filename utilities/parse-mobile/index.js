function parseMobile(phone) {
    if (!phone) return null;

    // Convert to string and remove spaces, dashes, brackets, etc.
    let number = String(phone).trim().replace(/[^\d]/g, "");

    // Remove leading country code (91)
    if (number.startsWith("91") && number.length === 12) {
        number = number.slice(2);
    }

    // Remove leading 0
    while (number.startsWith("0") && number.length > 10) {
        number = number.slice(1);
    }

    // Must be exactly 10 digits
    if (number.length !== 10) {
        return null;
    }

    // Indian mobile numbers start with 6,7,8,9
    if (!/^[6-9]\d{9}$/.test(number)) {
        return null;
    }

    return number;
}

module.exports = parseMobile;