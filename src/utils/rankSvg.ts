// SVG utility for rank icons on the map
// We provide these as raw SVG strings for Leaflet divIcon

const SVG_ICONS: Record<string, string> = {
    Sprout: '<path d="M7 20h10M10 20c5.5-3 5.5-13 0-13M10 20c-5.5-3-5.5-13 0-13M12 20v-9M12 11c3.5-2 3.5-7 0-7M12 11c-3.5-2-3.5-7 0-7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    Zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    Target: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="2.5"/>',
    Trophy: '<path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34M12 4v10.66" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 4h8c0 3-1 7-4 7s-4-4-4-7z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    Crown: '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    Gem: '<path d="M6 3h12l4 6-10 12L2 9z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 3L8 9l4 12 4-12-3-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 9h20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
};

export function getRankSvg(iconName: string, color: string, size: number = 24): string {
    const path = SVG_ICONS[iconName] || SVG_ICONS.Sprout;
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${path}
        </svg>
    `;
}
