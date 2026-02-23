import { useState, useEffect } from 'react';
import VersionCard from './components/VersionCard';

export const getTocInterface = (versionName) => {
  if (!versionName) return "N/A";
  const parts = versionName.split('.');
  if (parts.length < 3) return "N/A";

  const major = parseInt(parts[0], 10) || 0;
  const minor = parseInt(parts[1], 10) || 0;
  const patch = parseInt(parts[2], 10) || 0;

  return ((major * 10000) + (minor * 100) + patch).toString();
};

function App() {
  const [selectedCards, setSelectedCards] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedCards');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error("Failed to parse selectedCards from localStorage", error);
      return {};
    }
  });
  const [wowProducts, setWowProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [globalRegion, setGlobalRegion] = useState('eu');
  useEffect(() => {
    fetch('/api/v1/products')
      .then(res => res.json())
      .then(data => setWowProducts(data.products || []))
      .catch(err => console.error("Failed to load products", err))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('selectedCards', JSON.stringify(selectedCards));
    } catch (error) {
      console.error("Failed to save selectedCards to localStorage", error);
    }
  }, [selectedCards]);

  const handleToggleCard = (product, region, versionName) => {
    const cardId = `${product}-${region}-${versionName}`;
    const tocValue = getTocInterface(versionName);

    setSelectedCards(prev => {
      const newState = { ...prev };
      if (newState[cardId]) {
        delete newState[cardId];
      } else {
        newState[cardId] = tocValue;
      }
      return newState;
    });
  };

  const uniqueTocs = [...new Set(Object.values(selectedCards).filter(t => t !== "N/A"))];
  const tocDisplayString = uniqueTocs.length > 0
    ? `## Interface: ${uniqueTocs.join(', ')}`
    : "## Interface: (Select versions below)";

  return (
    <div className="container mx-auto max-w-5xl p-4 sm:p-8 min-h-screen">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3">WoW Version Tracker</h1>
        <p className="text-base-content/70">Select multiple versions to generate your TOC Interface tags.</p>

        <div className="max-w-2xl mx-auto mt-8 flex flex-col items-center gap-4">
          <input
            type="text"
            readOnly
            value={tocDisplayString}
            className="input input-bordered input-lg w-full text-center font-mono text-success font-bold bg-base-200 cursor-default focus:outline-none"
          />

          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm uppercase tracking-wide opacity-70">Global Region:</span>
            <select
              value={globalRegion}
              onChange={(e) => setGlobalRegion(e.target.value)}
              className="select select-bordered select-sm w-32"
            >
              <option value="us">US</option>
              <option value="eu">EU</option>
              <option value="kr">KR</option>
              <option value="tw">TW</option>
              <option value="cn">CN</option>
            </select>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {loadingProducts ? (
          <div className="flex justify-center items-center py-10 col-span-full">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          wowProducts.map(productName => (
            <VersionCard
              key={productName}
              product={productName}
              selectedCards={selectedCards}
              onToggle={handleToggleCard}
              globalRegion={globalRegion}
            />
          ))
        )}
      </main>
    </div>
  );
}

export default App;