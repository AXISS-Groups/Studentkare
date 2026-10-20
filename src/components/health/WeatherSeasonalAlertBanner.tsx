import { useState, useEffect } from 'react';
import { CloudRain, Sun, Thermometer, Wind, AlertTriangle, Umbrella, Droplets } from 'lucide-react';

export type SeasonType = 'monsoon' | 'summer' | 'winter' | 'spring';
export type TimeOfDayType = 'morning' | 'afternoon' | 'evening' | 'late_night';

export interface WeatherTelemetry {
  season: SeasonType;
  timeOfDay: TimeOfDayType;
  temperature: number; // in °C
  humidity: number; // in %
  aqi: number;
  uvIndex: number;
  rainChance: number; // in %
  location: string;
}

export function WeatherSeasonalAlertBanner() {
  const [telemetry, setTelemetry] = useState<WeatherTelemetry>({
    season: 'monsoon',
    timeOfDay: 'morning',
    temperature: 26,
    humidity: 78,
    aqi: 48,
    uvIndex: 5,
    rainChance: 65,
    location: 'University Campus Core (Hostels & Academic Block)'
  });

  const [activeSeasonFilter, setActiveSeasonFilter] = useState<SeasonType | 'auto'>('auto');
  const [, setIsRefreshing] = useState(false);

  // Determine current season and time of day based on system date
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth(); // 0 - 11
    const hour = now.getHours();

    let autoSeason: SeasonType = 'monsoon';
    if (month >= 5 && month <= 8) autoSeason = 'monsoon';
    else if (month >= 9 || month <= 1) autoSeason = 'winter';
    else if (month >= 2 && month <= 4) autoSeason = 'summer';

    let autoTime: TimeOfDayType = 'morning';
    if (hour >= 5 && hour < 12) autoTime = 'morning';
    else if (hour >= 12 && hour < 17) autoTime = 'afternoon';
    else if (hour >= 17 && hour < 22) autoTime = 'evening';
    else autoTime = 'late_night';

    if (activeSeasonFilter === 'auto') {
      setTelemetry(prev => ({
        ...prev,
        season: autoSeason,
        timeOfDay: autoTime,
        temperature: autoSeason === 'summer' ? 34 : autoSeason === 'winter' ? 16 : 26,
        humidity: autoSeason === 'monsoon' ? 82 : autoSeason === 'summer' ? 42 : 58,
        rainChance: autoSeason === 'monsoon' ? 75 : 10
      }));
    }
  }, [activeSeasonFilter]);

  const handleManualSeasonChange = (season: SeasonType) => {
    setActiveSeasonFilter(season);
    setIsRefreshing(true);
    setTimeout(() => {
      setTelemetry(prev => ({
        ...prev,
        season,
        temperature: season === 'summer' ? 36 : season === 'winter' ? 14 : season === 'monsoon' ? 26 : 24,
        humidity: season === 'monsoon' ? 85 : season === 'summer' ? 38 : season === 'winter' ? 55 : 50,
        rainChance: season === 'monsoon' ? 80 : 15
      }));
      setIsRefreshing(false);
    }, 400);
  };

  const getAlertContent = () => {
    switch (telemetry.season) {
      case 'monsoon':
        return {
          title: '🌧️ Monsoon Health Alert: Mosquito Breeding & Hydration Caution',
          badge: 'HIGH HUMIDITY ALERT',
          badgeBg: 'var(--sk-color-danger)',
          color: 'var(--sk-color-danger)',
          bgGradient: 'var(--sk-color-danger-bg)',
          borderColor: 'var(--sk-color-danger-rule)',
          icon: <CloudRain size={20} color="var(--sk-color-danger)" />,
          summary: '82% High Humidity detected across hostel corridors. Dengue & Viral Flu transmission risk elevated.',
          actionableTips: [
            'Clear stagnant water in hostel cooler trays every 3 days to prevent Aedes mosquito breeding.',
            'Drink purified RO water only. Free oral rehydration salts (ORS) available at campus pharmacy.',
            'Report persistent high fever (>100.4°F) or joint body pain to the Campus Health Center.'
          ]
        };

      case 'summer':
        return {
          title: '☀️ Summer Heatwave Warning: Dehydration & UV Index Caution',
          badge: 'HEATWAVE ADVISORY',
          badgeBg: 'var(--sk-color-attention)',
          color: 'var(--sk-color-attention)',
          bgGradient: 'var(--sk-color-attention-bg)',
          borderColor: 'var(--sk-color-rule)',
          icon: <Sun size={20} color="var(--sk-color-attention)" />,
          summary: `High Temperature (${telemetry.temperature}°C) & UV Index ${telemetry.uvIndex} between 12:00 PM and 04:00 PM.`,
          actionableTips: [
            'Carry a reusable water bottle and hydrate with electrolytes every 45 minutes.',
            'Avoid intense outdoor sports during peak midday sun hours (12:00 PM - 03:30 PM).',
            'Wear UV-rated sunglasses and wide-brim hats when walking between academic blocks.'
          ]
        };

      case 'winter':
        return {
          title: '❄️ Winter Chills & Upper Respiratory Protection Advisory',
          badge: 'WINTER WELLNESS',
          badgeBg: 'var(--sk-color-info)',
          color: 'var(--sk-color-info)',
          bgGradient: 'var(--sk-color-surface-3)',
          borderColor: 'var(--sk-color-rule)',
          icon: <Thermometer size={20} color="var(--sk-color-info)" />,
          summary: `Morning temperature dropped to ${telemetry.temperature}°C. Cold dry air accelerates viral flu transmission.`,
          actionableTips: [
            'Wear warm layered clothing during early 08:00 AM lectures.',
            'Get 15-20 minutes of morning sunlight for natural Vitamin D synthesis.',
            'Free Quadrivalent Influenza vaccination slots available at the Campus Health Desk.'
          ]
        };

      case 'spring':
      default:
        return {
          title: '🌸 Seasonal Allergen & Transition Climate Advisory',
          badge: 'SEASONAL ADVISORY',
          badgeBg: 'var(--sk-color-positive)',
          color: 'var(--sk-color-positive)',
          bgGradient: 'var(--sk-color-positive-bg)',
          borderColor: 'var(--sk-color-positive-rule)',
          icon: <Wind size={20} color="var(--sk-color-positive)" />,
          summary: 'High pollen count detected near botanical garden and central library greens.',
          actionableTips: [
            'Use HEPA-filtered reading pods in central library if prone to allergic rhinitis.',
            'Keep hostel room windows closed during late afternoon windy periods.',
            'Antihistamine eye drops and nasal sprays available at campus dispensary.'
          ]
        };
    }
  };

  const alertContent = getAlertContent();

  return (
    <section className="shop-container" style={{ marginBlock: '16px 24px' }}>
      {/* Main Weather & Seasonal Banner Card */}
      <div
        style={{
          background: alertContent.bgGradient,
          border: `1px solid ${alertContent.borderColor}`,
          borderRadius: 16,
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          position: 'relative'
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderBottom: `1px solid ${alertContent.borderColor}`, paddingBottom: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {alertContent.icon}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    background: alertContent.badgeBg,
                    color: 'var(--sk-color-on-action)',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                    textTransform: 'uppercase'
                  }}
                >
                  {alertContent.badge}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--sk-color-text-3)', fontWeight: 600 }}>
                  {telemetry.location}
                </span>
              </div>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', color: alertContent.color, fontWeight: 700 }}>
                {alertContent.title}
              </h3>
            </div>
          </div>

          {/* Interactive Season Override Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--sk-color-text-3)', fontWeight: 600 }}>Season Preview:</span>
            {(['auto', 'monsoon', 'summer', 'winter', 'spring'] as const).map(s => (
              <button
                key={s}
                onClick={() => s === 'auto' ? setActiveSeasonFilter('auto') : handleManualSeasonChange(s)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--sk-color-rule-strong)',
                  background: (activeSeasonFilter === s || (activeSeasonFilter === 'auto' && s === 'auto')) ? 'var(--sk-color-action)' : 'var(--sk-color-surface)',
                  color: (activeSeasonFilter === s || (activeSeasonFilter === 'auto' && s === 'auto')) ? 'var(--sk-color-on-action)' : 'var(--sk-color-text-2)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Live Weather Metrics Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: 10, padding: '8px 12px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--sk-color-text-3)', display: 'block' }}>Temp & Feeling</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--sk-color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Thermometer size={14} color="#e11d48" /> {telemetry.temperature}°C
            </strong>
          </div>

          <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: 10, padding: '8px 12px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--sk-color-text-3)', display: 'block' }}>Humidity</span>
            <strong style={{ fontSize: '0.95rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Droplets size={14} color="#0284c7" /> {telemetry.humidity}%
            </strong>
          </div>

          <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: 10, padding: '8px 12px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--sk-color-text-3)', display: 'block' }}>Campus AQI</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--sk-color-positive)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wind size={14} color="var(--sk-color-positive-fill)" /> {telemetry.aqi} (Good)
            </strong>
          </div>

          <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: 10, padding: '8px 12px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--sk-color-text-3)', display: 'block' }}>Rain Probability</span>
            <strong style={{ fontSize: '0.95rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Umbrella size={14} color="#7c3aed" /> {telemetry.rainChance}%
            </strong>
          </div>
        </div>

        {/* Actionable Health Precautions List */}
        <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: 12, padding: 14 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: 'var(--sk-color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} color={alertContent.badgeBg} /> Actionable Campus Health Precautions:
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.84rem', color: 'var(--sk-color-text-2)', display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.45 }}>
            {alertContent.actionableTips.map((tip, idx) => (
              <li key={idx}><strong>Step {idx + 1}:</strong> {tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
