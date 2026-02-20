import { useState, useEffect } from 'react';
import './App.css';
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
  const [selectedCards, setSelectedCards] = useState({});
  const [wowProducts, setWowProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetch('/api/v1/products')
      .then(res => res.json())
      .then(data => {
        setWowProducts(data.products || []);
      })
      .catch(err => console.error("Failed to load products", err))
      .finally(() => setLoadingProducts(false));
  }, []);

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
    <div className="app-container">
      <header>
        <h1>WoW Version Tracker</h1>
        <p>Select multiple versions to generate your TOC Interface tags.</p>

        <div className="global-toc-container">
          <input
            type="text"
            readOnly
            value={tocDisplayString}
            className="global-toc-input"
          />
        </div>
      </header>

      <main>
        {loadingProducts ? (
          <p>Loading product catalog from Blizzard...</p>
        ) : (
          wowProducts.map(productName => (
            <VersionCard
              key={productName}
              product={productName}
              selectedCards={selectedCards}
              onToggle={handleToggleCard}
            />
          ))
        )}
      </main>
    </div>
  );
}

export default App;