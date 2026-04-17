import Navbar from './Navbar';

const PageWrapper = ({ children }) => (
  <div className="min-h-screen bg-gray-950">
    <Navbar />
    <main className="max-w-5xl mx-auto px-4 py-8">
      {children}
    </main>
  </div>
);

export default PageWrapper;