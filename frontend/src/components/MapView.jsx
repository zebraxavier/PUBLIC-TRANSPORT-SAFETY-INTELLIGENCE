import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { transportLocations } from '../data/transportLocations';

const RISK_COLORS = {
    safe: { color: '#00ff88', fill: '#00ff8840' },
    warning: { color: '#ffb347', fill: '#ffb34740' },
    danger: { color: '#ff3366', fill: '#ff336640' },
};

function SetView({ center, zoom }) {
    const map = useMap();
    useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
    return null;
}

export default function MapView({ zones = [], selectedLocationId, onSelectLocation }) {
    const fallbackCenter = [11.1271, 78.6569];
    const selectedLocation = zones.find((zone) => zone.locationId === selectedLocationId) || zones[0];
    const center = selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : fallbackCenter;
    const zoom = selectedLocation ? 14 : 7;

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            zoomControl={true}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <SetView center={center} zoom={zoom} />

            {zones.map((zone) => {
                const rl = zone.riskLevel || 'safe';
                const clr = RISK_COLORS[rl] || RISK_COLORS.safe;
                const lat = zone.lat;
                const lng = zone.lng;
                if (!lat || !lng) return null;

                return (
                    <CircleMarker
                        key={zone.locationId || zone._id}
                        center={[lat, lng]}
                        radius={zone.locationId === selectedLocationId ? 18 : rl === 'danger' ? 16 : rl === 'warning' ? 13 : 11}
                        pathOptions={{
                            color: clr.color,
                            fillColor: clr.fill,
                            fillOpacity: 0.7,
                            weight: 2,
                        }}
                        eventHandlers={{
                            click: () => onSelectLocation?.(zone.locationId),
                        }}
                    >
                        <Popup className="ptsi-popup">
                            <div style={{ background: '#080d1a', color: '#e2e8f0', padding: '8px 12px', borderRadius: '8px', minWidth: '160px' }}>
                                <p style={{ fontWeight: 700, fontSize: '13px', color: clr.color }}>{zone.name}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{zone.type || 'Transport Zone'}</p>
                                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>Risk Score</span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: clr.color }}>{zone.riskScore || 0}</span>
                                </div>
                                {zone.incidentCount !== undefined && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>Incidents</span>
                                        <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{zone.incidentCount}</span>
                                    </div>
                                )}
                                <div style={{ marginTop: '6px', padding: '3px 8px', borderRadius: '12px', background: clr.fill, border: `1px solid ${clr.color}`, textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: clr.color, textTransform: 'uppercase' }}>{rl}</span>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </MapContainer>
    );
}
