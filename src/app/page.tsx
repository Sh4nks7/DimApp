import Image from "next/image";
import Auftragsverwaltung from './auftragsverwaltung';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 flex justify-center items-center bg-white shadow-sm">
        <div className="flex items-center">
          <Image
            src="/dimbau.png"
            alt="Dimbau Logo"
            width={100}
            height={50}
            priority
          />
          
        </div>
      </header>
      
      <main className="flex flex-col gap-8 items-center">
        <Auftragsverwaltung />
      </main>
      
      <footer className="flex gap-6 flex-wrap items-center justify-center">
        <h1>Erstellt von Dejan</h1>
       
      </footer>
    </div>
  );
}