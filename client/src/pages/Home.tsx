import Button from "@/components/ui/Button";

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold underline mb-4">Pairly Code Home</h1>
      <div className="space-x-4">
        <Button>Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
      </div>
    </div>
  );
}

export default Home;
