"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { Icon } from "leaflet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SailboatIcon as Boat, MapPin, Save, Upload, Trash2, Navigation, AlertTriangle } from "lucide-react"
import "leaflet-defaulticon-compatibility"
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css"

// Define task point interface
interface TaskPoint {
  id: number
  name: string
  latitude: number
  longitude: number
  altitude: number
}

// Define vehicle data interface
interface VehicleData {
  latitude: number
  longitude: number
  heading: number
  speed: number
  battery: number
}

// Custom marker icon
const boatIcon = new Icon({
  iconUrl: "/boat-icon.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

// Default position (Istanbul)
const DEFAULT_POSITION: [number, number] = [40.9876, 29.0213]
const DEFAULT_ZOOM = 13

export default function MapComponent() {
  const [taskPoints, setTaskPoints] = useState<TaskPoint[]>([])
  const [selectedPoint, setSelectedPoint] = useState<TaskPoint | null>(null)
  const [newPointName, setNewPointName] = useState("Görev Noktası")
  const [vehicleData, setVehicleData] = useState<VehicleData>({
    latitude: DEFAULT_POSITION[0],
    longitude: DEFAULT_POSITION[1],
    heading: 0,
    speed: 0,
    battery: 100,
  })
  const [isConnected, setIsConnected] = useState(false)
  const [missionActive, setMissionActive] = useState(false)

  // Simulate vehicle movement
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      if (missionActive && taskPoints.length > 0) {
        // Move toward the first task point
        const targetPoint = taskPoints[0]
        const currentPos = { lat: vehicleData.latitude, lng: vehicleData.longitude }
        const targetPos = { lat: targetPoint.latitude, lng: targetPoint.longitude }

        // Calculate direction and new position
        const dx = targetPos.lat - currentPos.lat
        const dy = targetPos.lng - currentPos.lng
        const distance = Math.sqrt(dx * dx + dy * dy)

        // Calculate heading in degrees
        const heading = Math.atan2(dy, dx) * (180 / Math.PI)

        // Move vehicle slightly toward target
        const moveSpeed = 0.0001 // Adjust for simulation speed
        const newLat = currentPos.lat + (dx / distance) * moveSpeed
        const newLng = currentPos.lng + (dy / distance) * moveSpeed

        // Update vehicle data
        setVehicleData((prev) => ({
          ...prev,
          latitude: newLat,
          longitude: newLng,
          heading: heading,
          speed: Math.random() * 5 + 5, // Random speed between 5-10 knots
          battery: Math.max(prev.battery - 0.01, 0), // Slowly decrease battery
        }))

        // If we're close enough to the target, remove it from the list
        if (distance < 0.0005) {
          setTaskPoints((prev) => prev.slice(1))
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isConnected, missionActive, taskPoints, vehicleData])

  // Add a new task point
  const addTaskPoint = (lat: number, lng: number) => {
    const newPoint: TaskPoint = {
      id: Date.now(),
      name: `${newPointName} ${taskPoints.length + 1}`,
      latitude: lat,
      longitude: lng,
      altitude: 0,
    }
    setTaskPoints([...taskPoints, newPoint])
  }

  // Remove a task point
  const removeTaskPoint = (id: number) => {
    setTaskPoints(taskPoints.filter((point) => point.id !== id))
    if (selectedPoint?.id === id) {
      setSelectedPoint(null)
    }
  }

  // Clear all task points
  const clearTaskPoints = () => {
    setTaskPoints([])
    setSelectedPoint(null)
  }

  // Export task points to JSON
  const exportTaskPoints = () => {
    const dataStr = JSON.stringify(taskPoints, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    const exportFileDefaultName = `ida_gorev_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  // Import task points from JSON
  const importTaskPoints = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        if (Array.isArray(json)) {
          setTaskPoints(json)
        }
      } catch (error) {
        console.error("Error parsing JSON file:", error)
        alert("Geçersiz görev dosyası!")
      }
    }
    reader.readAsText(file)
  }

  // Map click handler component
  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        addTaskPoint(e.latlng.lat, e.latlng.lng)
      },
    })
    return null
  }

  // Connect to vehicle
  const connectToVehicle = () => {
    setIsConnected(true)
  }

  // Disconnect from vehicle
  const disconnectFromVehicle = () => {
    setIsConnected(false)
    setMissionActive(false)
  }

  // Start mission
  const startMission = () => {
    if (taskPoints.length === 0) {
      alert("Lütfen önce görev noktaları ekleyin!")
      return
    }
    setMissionActive(true)
  }

  // Stop mission
  const stopMission = () => {
    setMissionActive(false)
  }

  // Emergency stop
  const emergencyStop = () => {
    setMissionActive(false)
    alert("ACİL DURDURMA ETKİNLEŞTİRİLDİ!")
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
      <div className="md:col-span-3 h-full">
        <MapContainer
          center={DEFAULT_POSITION}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Vehicle marker */}
          {isConnected && (
            <Marker
              position={[vehicleData.latitude, vehicleData.longitude]}
              icon={boatIcon}
              rotationAngle={vehicleData.heading}
              rotationOrigin="center"
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">İDA Aracı</div>
                  <div>Enlem: {vehicleData.latitude.toFixed(6)}</div>
                  <div>Boylam: {vehicleData.longitude.toFixed(6)}</div>
                  <div>Yön: {vehicleData.heading.toFixed(1)}°</div>
                  <div>Hız: {vehicleData.speed.toFixed(1)} knot</div>
                  <div>Pil: {vehicleData.battery.toFixed(0)}%</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Task point markers */}
          {taskPoints.map((point, index) => (
            <Marker
              key={point.id}
              position={[point.latitude, point.longitude]}
              eventHandlers={{
                click: () => setSelectedPoint(point),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">{point.name}</div>
                  <div>Enlem: {point.latitude.toFixed(6)}</div>
                  <div>Boylam: {point.longitude.toFixed(6)}</div>
                  <div>Yükseklik: {point.altitude}m</div>
                  <Button variant="destructive" size="sm" className="mt-2" onClick={() => removeTaskPoint(point.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Kaldır
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Path line */}
          {taskPoints.length > 0 && (
            <Polyline
              positions={taskPoints.map((point) => [point.latitude, point.longitude])}
              color="#2563eb"
              weight={3}
              dashArray="5, 10"
            />
          )}

          {/* Vehicle to first task point line */}
          {isConnected && taskPoints.length > 0 && (
            <Polyline
              positions={[
                [vehicleData.latitude, vehicleData.longitude],
                [taskPoints[0].latitude, taskPoints[0].longitude],
              ]}
              color="#ef4444"
              weight={3}
            />
          )}

          <MapClickHandler />
        </MapContainer>
      </div>

      <div className="space-y-4">
        <Tabs defaultValue="tasks">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Görevler</TabsTrigger>
            <TabsTrigger value="control">Kontrol</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-lg">Görev Noktaları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pointName">Nokta Adı</Label>
                  <Input
                    id="pointName"
                    value={newPointName}
                    onChange={(e) => setNewPointName(e.target.value)}
                    placeholder="Görev Noktası"
                  />
                </div>

                <div className="text-sm text-muted-foreground">Haritaya tıklayarak görev noktası ekleyin</div>

                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                  {taskPoints.map((point, index) => (
                    <div
                      key={point.id}
                      className={`flex justify-between items-center p-2 rounded-md text-sm ${
                        selectedPoint?.id === point.id ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                      onClick={() => setSelectedPoint(point)}
                    >
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{point.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeTaskPoint(point.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={clearTaskPoints}>
                    <Trash2 className="h-4 w-4 mr-1" /> Temizle
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={exportTaskPoints}>
                    <Save className="h-4 w-4 mr-1" /> Kaydet
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => document.getElementById("import-file")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" /> Yükle
                  </Button>
                  <input id="import-file" type="file" accept=".json" className="hidden" onChange={importTaskPoints} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="control" className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-lg">Araç Kontrolü</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={isConnected ? "bg-muted" : ""}
                    onClick={connectToVehicle}
                    disabled={isConnected}
                  >
                    <Boat className="h-4 w-4 mr-1" /> Bağlan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={!isConnected ? "bg-muted" : ""}
                    onClick={disconnectFromVehicle}
                    disabled={!isConnected}
                  >
                    <Boat className="h-4 w-4 mr-1" /> Bağlantıyı Kes
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className={missionActive ? "bg-muted" : "bg-green-600 hover:bg-green-700"}
                    onClick={startMission}
                    disabled={!isConnected || missionActive || taskPoints.length === 0}
                  >
                    <Navigation className="h-4 w-4 mr-1" /> Görevi Başlat
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className={!missionActive ? "bg-muted" : "bg-amber-500 hover:bg-amber-600"}
                    onClick={stopMission}
                    disabled={!isConnected || !missionActive}
                  >
                    <Navigation className="h-4 w-4 mr-1" /> Görevi Durdur
                  </Button>
                </div>

                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full py-6"
                  onClick={emergencyStop}
                  disabled={!isConnected}
                >
                  <AlertTriangle className="h-5 w-5 mr-2" /> ACİL DURDURMA
                </Button>

                {isConnected && (
                  <Card className="bg-muted">
                    <CardContent className="p-3">
                      <div className="text-sm space-y-1">
                        <div className="grid grid-cols-2">
                          <span className="font-medium">Pil:</span>
                          <span className={vehicleData.battery < 20 ? "text-red-500 font-bold" : ""}>
                            {vehicleData.battery.toFixed(0)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2">
                          <span className="font-medium">Hız:</span>
                          <span>{vehicleData.speed.toFixed(1)} knot</span>
                        </div>
                        <div className="grid grid-cols-2">
                          <span className="font-medium">Yön:</span>
                          <span>{vehicleData.heading.toFixed(1)}°</span>
                        </div>
                        <div className="grid grid-cols-2">
                          <span className="font-medium">Durum:</span>
                          <span className={missionActive ? "text-green-500" : "text-amber-500"}>
                            {missionActive ? "Görevde" : "Hazır"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
