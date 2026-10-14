import Hero from '../components/Hero.jsx';
import RewardBanner from '../components/RewardBanner.jsx';
import ServiceGrid from '../components/ServiceGrid.jsx';
import MarketCards from '../components/MarketCards.jsx';
import PopularPosts from '../components/PopularPosts.jsx';
import Features from '../components/Features.jsx';

export default function HomePage() {
  return (
    <>
      <Hero />
      <RewardBanner />
      <ServiceGrid />
      <MarketCards />
      <PopularPosts />
      <Features />
    </>
  );
}
