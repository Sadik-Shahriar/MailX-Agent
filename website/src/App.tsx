import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { InteractiveDemo } from './components/InteractiveDemo';
import { InstallationGuide } from './components/InstallationGuide';
import { FeaturesGrid } from './components/FeaturesGrid';
import { SecurityPrivacy } from './components/SecurityPrivacy';
import { TeamSection } from './components/TeamSection';
import { Footer } from './components/Footer';

export function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Dynamic atmospheric background */}
      <div className="bg-atmosphere" />
      <div className="bg-grid" />

      {/* Navigation Header */}
      <Navbar />

      {/* Main Content Sections */}
      <main style={{ flex: 1 }}>
        <Hero />
        <InteractiveDemo />
        <InstallationGuide />
        <FeaturesGrid />
        <SecurityPrivacy />
        <TeamSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
