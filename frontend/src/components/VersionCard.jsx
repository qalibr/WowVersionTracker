import { useState, useEffect } from 'react';

function VersionCard({ product, selectedCards, onToggle }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRegion, setSelectedRegion] = useState('eu');

    useEffect(() => {
        fetch(`/api/v1/versions/${product}`)
            .then(res => res.json())
            .then(fetchedData => {
                setData(fetchedData);

                // If a highly experimental branch is US-only and 'eu' doesn't exist, automatically 
                // fall back to the first available region so the UI doesn't break.
                if (fetchedData.length > 0) {
                    const regions = fetchedData.map(r => r.Region);
                    if (!regions.includes('eu')) {
                        setSelectedRegion(regions[0]);
                    }
                }
            })
            .catch(err => {
                console.error(err);
                setError(err.toString());
            })
            .finally(() => setLoading(false));
    }, [product]);

    if (loading) return <div className="card loading">Loading {product}...</div>;
    if (error) return <div className="card error">Error: {error}</div>;

    const availableRegions = [...new Set(data.map(row => row.Region))];
    const filteredData = data.filter(row => row.Region === selectedRegion);

    return (
        <div className="version-container">
            {/* We group the Title and Dropdown in a flex header */}
            <div className="version-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Product: {product}</h2>

                {availableRegions.length > 0 && (
                    <select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="region-select"
                        style={{ padding: '5px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {availableRegions.map(region => (
                            <option key={region} value={region}>
                                {region.toUpperCase()}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="grid">
                {filteredData.map((row, index) => {
                    const cardId = `${product}-${row.Region}-${row.VersionsName}`;
                    const isSelected = !!selectedCards[cardId];

                    return (
                        <div
                            key={index}
                            className={`version-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => onToggle(product, row.Region, row.VersionsName)}
                        >
                            <div className="region-badge">{row.Region.toUpperCase()}</div>
                            <div className="version-number">{row.VersionsName}</div>
                            <div className="build-id">Build ID: {row.BuildId}</div>
                            <div className="hash">Config: {row.BuildConfig.substring(0, 8)}...</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default VersionCard;