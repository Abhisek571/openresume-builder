// ============================================================
// initials.js
// This module is responsible for computing the initials
// from a person's full name string. It is used to render the
// avatar badge in the resume header.
// ============================================================

/**
 * Computes the initials from a full name.
 * @param {string} fullName - The full name to compute initials from.
 * @returns {string} The computed initials as an uppercase string.
 */
export function getInitials(fullName) {
  // First, we check if the input is valid before doing anything else
  try {
    // Check if fullName is null or undefined or not a string
    if (fullName === null || fullName === undefined || typeof fullName !== 'string') {
      // Return an empty string if the input is invalid
      return '';
    }

    // Split the full name into an array of parts by whitespace
    const parts = fullName.split(' ');

    // Create an array to hold the initials we compute
    const initialsArray = [];

    // Loop over each part of the name one by one
    for (let i = 0; i < parts.length; i++) {
      // Get the current part at this index
      const part = parts[i];
      // Check if the part is not an empty string
      if (part.length > 0) {
        // Get the first character of the part and uppercase it
        const firstChar = part.charAt(0).toUpperCase();
        // Add the uppercased first character to the initials array
        initialsArray.push(firstChar);
      }
    }

    // Join the initials array into a single string and return it
    return initialsArray.join('');
  } catch (error) {
    // If anything goes wrong at all, log the error and return an empty string
    console.error('An error occurred while computing the initials:', error);
    return '';
  }
}
