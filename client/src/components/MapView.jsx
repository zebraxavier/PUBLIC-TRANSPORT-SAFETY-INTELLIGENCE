import { useEffect, useRef } from 'react'

const ZONE_COLORS = {
    safe: { fill: '#22c55e', stroke: '#16a34a', fillOpacity: 0.25 },
    warning: { fill: '#f59e0b', stroke: '#d97706', fillOpacity: 0.3 },
    danger: { fill: '#ef4444', stroke: '#dc2626', fillOpacity: 0.35 },
}

export default function MapView({ zones = [], center = [13.0827, 80.2707], zoom = 12, height = '100%' }) {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markersRef = useRef([])

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (mapInstanceRef.current) return // already initialized

        // Load Leaflet dynamically to avoid SSR issues
        import('leaflet').then(L => {
            if (mapInstanceRef.current) return

            const map = L.default.map(mapRef.current, {
                center,
                zoom,
                zoomControl: true,
                scrollWheelZoom: true,
            })

            // Dark tile layer
            L.default.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© OpenStreetMap © CARTO',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(map)

            mapInstanceRef.current = map
        })
    }, [])

    useEffect(() => {
        if (!mapInstanceRef.current || !zones.length) return

        import('leaflet').then(L => {
            const map = mapInstanceRef.current

            // Clear markers
            markersRef.current.forEach(m => map.removeLayer(m))
            markersRef.current = []

            zones.forEach(zone => {
                if (!zone.location?.lat || !zone.location?.lng) return
                const cfg = ZONE_COLORS[zone.riskLevel] || ZONE_COLORS.safe

                // Circle overlay
                const circle = L.default.circle([zone.location.lat, zone.location.lng], {
                    radius: 400,
                    color: cfg.stroke,
                    fillColor: cfg.fill,
                    fillOpacity: cfg.fillOpacity,
                    weight: 2,
                }).addTo(map)

                // Custom icon
                const iconHtml = `
          <div style="
            width: 36px; height: 36px;
            background: ${cfg.fill}30;
            border: 2px solid ${cfg.fill};
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px;
            box-shadow: 0 0 12px ${cfg.fill}60;
          ">
            ${zone.type === 'metro' ? '🚇' : zone.type === 'train_station' ? '🚂' : zone.type === 'highway' ? '🛣️' : zone.type === 'terminal' ? '🚌' : '🚏'}
          </div>`

                const marker = L.default.marker([zone.location.lat, zone.location.lng], {
                    icon: L.default.divIcon({ html: iconHtml, className: '', iconSize: [36, 36], iconAnchor: [18, 18] })
                }).addTo(map)

                const popupContent = `
          <div style="font-family: Inter, sans-serif; min-width: 180px; color: #e5e7eb; background: #1a1d2e; padding: 12px; border-radius: 10px; border: 1px solid #2a2d3e;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">${zone.name}</div>
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 8px;">${zone.type?.replace('_', ' ').toUpperCase()}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div>
                <div style="font-size: 10px; color: #6b7280;">RISK SCORE</div>
                <div style="font-size: 20px; font-weight: 800; color: ${cfg.fill};">${zone.riskScore}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: #6b7280;">STATUS</div>
                <div style="margin-top: 4px; font-size: 12px; font-weight: 600; color: ${cfg.fill}; text-transform: uppercase;">${zone.riskLevel}</div>
              </div>
            </div>
            <hr style="border-color: #2a2d3e; margin: 8px 0;" />
            <div style="font-size: 11px; color: #9ca3af;">👥 Crowd: ${(zone.crowdDensity * 100).toFixed(0)}%</div>
            <div style="font-size: 11px; color: #9ca3af;">🚗 Vehicles: ${zone.vehicleCount}</div>
            <div style="font-size: 11px; color: #9ca3af;">⚠️ Incidents: ${zone.incidentCount}</div>
          </div>`

                marker.bindPopup(L.default.popup({
                    className: 'ptsi-popup',
                    maxWidth: 240,
                }).setContent(popupContent))

                markersRef.current.push(circle, marker)
            })
        })
    }, [zones])

    return (
        <div
            ref={mapRef}
            style={{ width: '100%', height, borderRadius: '1rem', overflow: 'hidden' }}
            className="bg-[#0a0d1a]"
        />
    )
}
