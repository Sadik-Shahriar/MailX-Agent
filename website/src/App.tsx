import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeaturesGrid } from './components/FeaturesGrid';
import { ArchitectureSection } from './components/ArchitectureSection';
import { InstallationGuide } from './components/InstallationGuide';
import { SecurityPrivacy } from './components/SecurityPrivacy';
import { TeamSection } from './components/TeamSection';
import { Footer } from './components/Footer';

export function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Subtle non-slop structural backgrounds */}
      <div className="bg-grid-substrate" />
      <div className="bg-accent-ambient" />

      {/* Navigation Header */}
      <Navbar />

      {/* Main Content Sections */}
      <main style={{ flex: 1 }}>
        <Hero />
        <FeaturesGrid />
        <ArchitectureSection />
        <InstallationGuide />
        <SecurityPrivacy />
        <TeamSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
