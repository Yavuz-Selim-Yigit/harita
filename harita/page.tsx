import MapComponent from "@/components/map-component"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-2xl font-bold text-center mb-4">İDA Harita Entegrasyonu</h1>
        <div className="w-full h-[calc(100vh-120px)]">
          <MapComponent />
        </div>
      </div>
    </main>
  )
}
