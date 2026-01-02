/**
 * Formats a location string based on context.
 * 
 * Rules:
 * 1. Cleans the name: Removes redundant country suffix (e.g. "Onomichi, Japan" -> "Onomichi").
 * 2. Appends country: "Place, Country" by default.
 * 3. Context aware: If contextCountry matches, omits the country (returns just "Place").
 * 
 * @param name The raw place name (e.g., "Onomichi" or "Onomichi, Japan")
 * @param country The country name (e.g., "Japan")
 * @param contextCountry Optional. The country of the parent context (e.g. Destination's country).
 * @returns Formatted string
 */
/**
 * Splits a location string into its constituent parts for visual formatting.
 * Returns { name, country } where country is only present if it should be displayed.
 */
export function getLocationParts(name: string, country: string | null | undefined, contextCountry?: string | null | undefined): { name: string; country?: string } {
    if (!name) return { name: "" };

    // 1. Clean the name
    let cleanName = name.trim();

    // Helper to strip specific country suffix
    const stripSuffix = (n: string, c: string) => {
        const cTrimmed = c.trim().toLowerCase();
        const nLower = n.toLowerCase();
        // Check for ", Country", " Country", ",Country"
        if (nLower.endsWith(`, ${cTrimmed}`)) {
            return n.slice(0, - (cTrimmed.length + 2));
        } else if (nLower.endsWith(` ${cTrimmed}`)) {
            return n.slice(0, - (cTrimmed.length + 1));
        } else if (nLower.endsWith(`,${cTrimmed}`)) {
            return n.slice(0, - (cTrimmed.length + 1));
        }
        return n;
    };

    // Strip based on Own Country
    if (country) {
        cleanName = stripSuffix(cleanName, country);
    }

    // Strip based on Context Country (Robustness fallback)
    if (contextCountry) {
        cleanName = stripSuffix(cleanName, contextCountry);
    }

    // 2. Determine Display Country
    let displayCountry: string | undefined = undefined;

    // Logic:
    // If context is provided...
    if (contextCountry) {
        if (country && country.toLowerCase() !== contextCountry.toLowerCase()) {
            // Different country! Show it.
            displayCountry = country;
        }
        // Else (Same country or unknown but matches context strip) -> Don't show country.
    } else {
        // No context (or Global context implicit) -> Show country if available
        if (country) {
            displayCountry = country;
        }
    }

    return { name: cleanName, country: displayCountry };
}

/**
 * Formats a location string based on context.
 * Returns a single string "Place, Country" or "Place".
 * Useful for string-only contexts (alt text, titles).
 */
export function formatLocation(name: string, country: string | null | undefined, contextCountry?: string | null | undefined): string {
    const parts = getLocationParts(name, country, contextCountry);
    if (parts.country) {
        return `${parts.name}, ${parts.country}`;
    }
    return parts.name;
}
