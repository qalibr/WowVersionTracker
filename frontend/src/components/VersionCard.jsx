import { useState, useEffect } from 'react';

function VersionCard({ product, selectedCards, onToggle, globalRegion }) {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // MOCK DATA FOR TESTING 'wow' product history
        if (product === 'wow') {
            const mockWowData = {
                "us": [
                    { version_name: "10.2.7", build_id: "54765", build_config: "d276a85f" },
                    { version_name: "10.2.6", build_id: "54321", build_config: "f1e2d3c4" },
                    { version_name: "10.2.5", build_id: "51234", build_config: "a9b8c7d6" }
                ],
                "eu": [
                    { version_name: "10.2.7", build_id: "54765", build_config: "d276a85f" },
                    { version_name: "10.2.6", build_id: "54320", build_config: "f1e2d3c3" },
                    { version_name: "10.2.5", build_id: "51234", build_config: "a9b8c7d6" }
                ],
                "kr": [
                    { version_name: "10.2.7", build_id: "54765", build_config: "d276a85f" },
                ]
            };
            setData(mockWowData);
            setLoading(false);
            return;
        }

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

    const currentBuild = regionHistory[0];
    const mainCardId = `${product}-${displayRegion}-${currentBuild.version_name}`;
    const isMainSelected = !!selectedCards[mainCardId];

    const historyDepth = 3;
    const historyList = [];
    for (let i = 1; i < historyDepth; i++) {
        historyList.push(regionHistory[i] || null);
    }

    const isAnyHistorySelected = historyList.some(build =>
        build ? !!selectedCards[`${product}-${displayRegion}-${build.version_name}`] : false
    );

    return (
        <div className="flex flex-wrap gap-3 mb-4">
            <div className={`card bg-base-200 border-2 flex-grow min-w-[240px] transition-all flex flex-col ${isMainSelected ? 'border-primary bg-primary/5' : 'border-transparent'}`}>

                <div
                    className="p-4 flex-grow cursor-pointer hover:bg-base-300/50 transition-colors rounded-t-2xl"
                    onClick={() => onToggle(product, displayRegion, currentBuild.version_name)}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                            <span className="text-sm font-black uppercase text-primary">{product.replace('_', ' ')}</span>
                        </div>

                        <div className="flex items-center gap-1.5 h-6">
                            <div className={`badge badge-sm ${displayRegion !== globalRegion ? 'badge-warning' : 'badge-neutral'}`}>
                                {displayRegion.toUpperCase()}
                            </div>
                            {isMainSelected && (
                                <span className="text-primary" title="Selected">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            )}
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

                <details className={`collapse collapse-arrow rounded-none rounded-b-xl border-t transition-colors ${isAnyHistorySelected
                        ? 'bg-primary/8 border-primary/30 text-primary'
                        : 'bg-base-300 border-base-content/10 text-base-content'
                    }`}>
                    <summary className={`collapse-title min-h-0 py-2 text-xs font-semibold cursor-pointer transition-opacity ${isAnyHistorySelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                        }`}>
                        {isAnyHistorySelected ? 'History Selected' : 'View Build History'}
                    </summary>
                    <div className="collapse-content text-xs pb-2 px-2 text-base-content">
                        <ul className="space-y-1 mt-1">
                            {historyList.map((build, idx) => {
                                if (!build) {
                                    return (
                                        <li key={idx} className="flex justify-between items-center px-2 py-1">
                                            <span className="italic opacity-50">Awaiting previous build...</span>
                                        </li>
                                    );
                                }

                                const hCardId = `${product}-${displayRegion}-${build.version_name}`;
                                const isHSelected = !!selectedCards[hCardId];

                                return (
                                    <li
                                        key={idx}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onToggle(product, displayRegion, build.version_name);
                                        }}
                                        className={`flex justify-between items-center px-2 py-1.5 rounded cursor-pointer transition-colors ${isHSelected ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-base-200 opacity-80 hover:opacity-100'}`}
                                    >
                                        <span className="font-mono">{build.version_name}</span>
                                        <div className="flex items-center gap-2">
                                            <span>Build {build.build_id}</span>
                                            {isHSelected && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </details>

            </div>
        </div>
    );
}

export default VersionCard;