import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEFAULT_CENTER = { lat: 41.0082, lng: 28.9784 }
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

declare global {
  interface Window {
    google?: any
    __googleMapsScriptPromise?: Promise<any>
  }
}

function loadGoogleMapsScript(): Promise<any> {
  if (window.google?.maps) {
    return Promise.resolve(window.google)
  }

  if (window.__googleMapsScriptPromise) {
    return window.__googleMapsScriptPromise
  }

  if (!MAPS_KEY) {
    return Promise.reject(new Error('Google Maps API anahtarı tanımlı değil.'))
  }

  window.__googleMapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Google Maps script yüklenemedi.'))
    document.head.appendChild(script)
  })

  return window.__googleMapsScriptPromise
}

interface GoogleMapPickerProps {
  lat?: number
  lng?: number
  addressQuery?: string
  onAddressQueryChange: (value: string) => void
  onLocationChange: (lat: number, lng: number) => void
  readOnly?: boolean
}

export function GoogleMapPicker({
  lat,
  lng,
  addressQuery,
  onAddressQueryChange,
  onLocationChange,
  readOnly = false,
}: GoogleMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)

  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap')

  const canRenderMap = useMemo(() => Boolean(MAPS_KEY), [])

  useEffect(() => {
    if (!canRenderMap || !mapContainerRef.current) {
      return
    }

    let mounted = true

    loadGoogleMapsScript()
      .then((google) => {
        if (!mounted || !mapContainerRef.current) return

        const center = lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER

        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: lat != null && lng != null ? 15 : 10,
          mapTypeId: mapType,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: false,
        })

        geocoderRef.current = new google.maps.Geocoder()

        if (!readOnly) {
          mapRef.current.addListener('click', (event: any) => {
            const clickedLat = event?.latLng?.lat?.()
            const clickedLng = event?.latLng?.lng?.()
            if (clickedLat == null || clickedLng == null) return

            placeMarker(clickedLat, clickedLng)
            onLocationChange(clickedLat, clickedLng)
          })
        }

        if (lat != null && lng != null) {
          placeMarker(lat, lng)
        }

        setIsMapLoaded(true)
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Harita yüklenemedi.'
        setMapError(message)
      })

    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRenderMap])

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    mapRef.current.setMapTypeId(mapType)
  }, [mapType])

  useEffect(() => {
    if (lat == null || lng == null || !mapRef.current) return
    placeMarker(lat, lng)
  }, [lat, lng])

  const placeMarker = (nextLat: number, nextLng: number) => {
    if (!mapRef.current || !window.google?.maps) return

    const position = { lat: nextLat, lng: nextLng }

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        draggable: !readOnly,
      })

      if (!readOnly) {
        markerRef.current.addListener('dragend', (event: any) => {
          const draggedLat = event?.latLng?.lat?.()
          const draggedLng = event?.latLng?.lng?.()
          if (draggedLat == null || draggedLng == null) return
          onLocationChange(draggedLat, draggedLng)
        })
      }
    } else {
      markerRef.current.setPosition(position)
      markerRef.current.setMap(mapRef.current)
    }

    mapRef.current.panTo(position)
  }

  const handleAddressSearch = () => {
    const query = (addressQuery || '').trim()
    if (!query) return

    if (!geocoderRef.current || !mapRef.current) {
      setMapError('Harita hazır değil, lütfen tekrar deneyin.')
      return
    }

    geocoderRef.current.geocode({ address: query }, (results: any[], status: string) => {
      if (status !== 'OK' || !results?.length) {
        setMapError('Adres bulunamadı. Lütfen farklı bir sorgu deneyin.')
        return
      }

      const location = results[0].geometry?.location
      const foundLat = location?.lat?.()
      const foundLng = location?.lng?.()

      if (foundLat == null || foundLng == null) {
        setMapError('Adres koordinatları alınamadı.')
        return
      }

      setMapError(null)
      placeMarker(foundLat, foundLng)
      onLocationChange(foundLat, foundLng)
      mapRef.current.setZoom(16)
    })
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      {!readOnly ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="mapAddressSearch">Adres Ara</Label>
            <Input
              id="mapAddressSearch"
              placeholder="Adres girin ve konumu buldurun"
              value={addressQuery || ''}
              onChange={(event) => onAddressQueryChange(event.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={handleAddressSearch} disabled={!canRenderMap || !isMapLoaded}>
            Ara
          </Button>
        </div>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mapType === 'roadmap' ? 'default' : 'outline'}
            onClick={() => setMapType('roadmap')}
            disabled={!canRenderMap || !isMapLoaded}
          >
            Harita
          </Button>
          <Button
            type="button"
            variant={mapType === 'satellite' ? 'default' : 'outline'}
            onClick={() => setMapType('satellite')}
            disabled={!canRenderMap || !isMapLoaded}
          >
            Uydu
          </Button>
        </div>
      ) : null}

      {!canRenderMap ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Google Maps için `VITE_GOOGLE_MAPS_API_KEY` tanımlı değil. Harita alanı pasif.
        </div>
      ) : (
        <div className="h-[320px] w-full overflow-hidden rounded-md border">
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>
      )}

      {mapError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
          {mapError}
        </div>
      ) : null}
    </div>
  )
}
