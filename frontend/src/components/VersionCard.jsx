import { useState, useEffect } from 'react';

function VersionCard({ product, selectedCards, onToggle, globalRegion }) {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`/api/v1/versions/${product}`)
            .then(res => res.json())
            .then(fetchedData => setData(fetchedData))
            .catch(err => {
                console.error(err);
                setError(err.toString());
            })
            .finally(() => setLoading(false));
    }, [product]);

    if (loading) return <div className="flex gap-2 items-center my-4"><span className="loading loading-spinner text-primary"></span>Loading {product}...</div>;
    if (error) return <div className="alert alert-error my-4">Error: {error}</div>;

    const availableRegions = Object.keys(data);
    let displayRegion = globalRegion;
    if (availableRegions.length > 0 && !availableRegions.includes(globalRegion)) {
        displayRegion = availableRegions[0];
    }

    const regionHistory = data[displayRegion] || [];
    if (regionHistory.length === 0) return null;

    // The first item is our current build
    const currentBuild = regionHistory[0];
    const cardId = `${product}-${displayRegion}-${currentBuild.version_name}`;
    const isSelected = !!selectedCards[cardId];

    // Prepare history (index 1 and 2). If data doesn't exist yet, we pad it with nulls for placeholders.
    const historyDepth = 3;
    const historyList = [];
    for (let i = 1; i < historyDepth; i++) {
        historyList.push(regionHistory[i] || null);
    }

    return (
        <div className="flex flex-wrap gap-3 mb-4">
            <div
                onClick={() => onToggle(product, displayRegion, currentBuild.version_name)}
                className={`card bg-base-200 border-2 flex-grow min-w-[240px] cursor-pointer hover:shadow-lg transition-all flex flex-col ${isSelected ? 'border-primary bg-primary/10' : 'border-transparent'}`}
            >
                {/* Main Card Content */}
                <div className="p-4 flex-grow">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                            <span className="text-sm font-black uppercase text-primary">{product.replace('_', ' ')}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className={`badge badge-sm ${displayRegion !== globalRegion ? 'badge-warning' : 'badge-neutral'}`}>
                                {displayRegion.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <span className="text-xl font-mono font-bold block leading-none" title={currentBuild.version_name}>
                            {currentBuild.version_name}
                        </span>
                    </div>

                    <div className="text-[11px] opacity-70 mt-auto pt-2 border-t border-base-content/10 flex justify-between">
                        <span>Build: <span className="font-semibold text-base-content">{currentBuild.build_id}</span></span>
                        <span className="font-mono">Cfg: {currentBuild.build_config ? currentBuild.build_config.substring(0, 8) : 'N/A'}</span>
                    </div>
                </div>

                {/* History Accordion */}
                {/* We use stopPropagation so clicking the accordion doesn't toggle card selection */}
                <details
                    className="collapse collapse-arrow bg-base-300 rounded-none rounded-b-2xl border-t border-base-content/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <summary className="collapse-title min-h-0 py-2 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity">
                        View Build History
                    </summary>
                    <div className="collapse-content text-xs opacity-80 pb-3">
                        <ul className="space-y-2 mt-1">
                            {historyList.map((build, idx) => (
                                <li key={idx} className="flex justify-between items-center border-b border-base-content/5 pb-1 last:border-0 last:pb-0">
                                    {build ? (
                                        <>
                                            <span className="font-mono text-base-content font-medium">{build.version_name}</span>
                                            <span>Build {build.build_id}</span>
                                        </>
                                    ) : (
                                        <span className="italic opacity-50">Awaiting previous build...</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </details>

            </div>
        </div>
    );
}

export default VersionCard;