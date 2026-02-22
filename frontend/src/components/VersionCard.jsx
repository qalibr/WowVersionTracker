import { useState, useEffect } from 'react';

function VersionCard({ product, selectedCards, onToggle, globalRegion }) {
    const [data, setData] = useState([]);
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

    const availableRegions = [...new Set(data.map(row => row.Region))];

    let displayRegion = globalRegion;
    if (availableRegions.length > 0 && !availableRegions.includes(globalRegion)) {
        displayRegion = availableRegions[0];
    }

    const filteredData = data.filter(row => row.Region === displayRegion);

    if (filteredData.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-3 mb-4">
            {filteredData.map((row, index) => {
                const cardId = `${product}-${row.Region}-${row.VersionsName}`;
                const isSelected = !!selectedCards[cardId];

                return (
                    <div
                        key={index}
                        onClick={() => onToggle(product, row.Region, row.VersionsName)}
                        className={`card bg-base-200 border-2 flex-grow min-w-[200px] cursor-pointer hover:shadow-lg transition-all p-4 ${isSelected ? 'border-primary bg-primary/10' : 'border-transparent'}`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col">
                                <span className="text-sm font-black uppercase text-primary">{product.replace('_', ' ')}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className={`badge badge-sm ${displayRegion !== globalRegion ? 'badge-warning' : 'badge-neutral'}`}>
                                    {row.Region.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="mb-2">
                            <span className="text-lg font-mono font-bold block leading-none" title={row.VersionsName}>
                                {row.VersionsName}
                            </span>
                        </div>

                        <div className="text-[11px] opacity-70 mt-auto pt-2 border-t border-base-content/10 flex justify-between">
                            <span>Build: <span className="font-semibold text-base-content">{row.BuildId}</span></span>
                            <span className="font-mono">Cfg: {row.BuildConfig.substring(0, 8)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default VersionCard;