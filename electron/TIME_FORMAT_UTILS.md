# Time Format Utilities

Utility functions để format và display thời gian một cách linh hoạt trong Electron app.

## 📦 Installation

File đã được tạo tại: `src/renderer/utils/timeFormat.ts`

```typescript
import { 
  formatDuration, 
  formatDurationShort, 
  formatDurationFull,
  formatDurationMinimal,
  formatDurationSmart
} from './utils/timeFormat';
```

## 🚀 Quick Start

### Basic Usage

```typescript
// Default (short format)
formatDuration(10000)        // "10 sec"
formatDuration(300000)       // "5 min"
formatDuration(3600000)      // "1 hr"
```

### Format Variations

```typescript
const fiveMinutes = 300000;

formatDurationShort(fiveMinutes)     // "5 min"
formatDurationFull(fiveMinutes)      // "5 minutes"
formatDurationMinimal(fiveMinutes)   // "5m"
```

## 📚 API Reference

### Main Functions

#### `formatDuration(milliseconds, options)`

Main function với đầy đủ options.

**Parameters:**
- `milliseconds` (number): Thời gian tính bằng milliseconds
- `options` (object, optional):
  - `format`: `"short"` | `"full"` | `"minimal"` (default: `"short"`)
  - `maxUnits`: number (default: 1) - Số lượng đơn vị tối đa hiển thị
  - `includeZero`: boolean (default: false) - Có hiển thị giá trị 0 không
  - `delimiter`: string (default: `" "`) - Ký tự ngăn cách giữa các đơn vị

**Examples:**

```typescript
formatDuration(10000)
// "10 sec"

formatDuration(10000, { format: "full" })
// "10 seconds"

formatDuration(10000, { format: "minimal" })
// "10s"

formatDuration(3665000, { maxUnits: 2 })
// "1 hr 1 min"

formatDuration(3665000, { maxUnits: 3, format: "full" })
// "1 hour 1 minute 5 seconds"
```

#### `formatDurationShort(milliseconds)`

Convenience wrapper cho short format.

```typescript
formatDurationShort(300000)   // "5 min"
formatDurationShort(3600000)  // "1 hr"
```

#### `formatDurationFull(milliseconds)`

Convenience wrapper cho full format.

```typescript
formatDurationFull(300000)    // "5 minutes"
formatDurationFull(3600000)   // "1 hour"
formatDurationFull(7200000)   // "2 hours"
```

#### `formatDurationMinimal(milliseconds)`

Convenience wrapper cho minimal format.

```typescript
formatDurationMinimal(300000)    // "5m"
formatDurationMinimal(3600000)   // "1h"
```

#### `formatDurationSmart(milliseconds, format)`

Tự động chọn đơn vị phù hợp nhất.

```typescript
formatDurationSmart(5000)      // "5 sec"
formatDurationSmart(90000)     // "1 min 30 sec"
formatDurationSmart(300000)    // "5 min"
formatDurationSmart(5400000)   // "1 hr 30 min"
```

#### `formatDurationDetailed(milliseconds, format)`

Hiển thị chi tiết với nhiều đơn vị (maxUnits: 3).

```typescript
formatDurationDetailed(3665000)           // "1 hr 1 min 5 sec"
formatDurationDetailed(3665000, "full")   // "1 hour 1 minute 5 seconds"
```

#### `formatTimeHMS(milliseconds)`

Format theo dạng HH:MM:SS.

```typescript
formatTimeHMS(3665000)    // "01:01:05"
formatTimeHMS(300000)     // "00:05:00"
```

### Conversion Functions

```typescript
secondsToMs(30)    // 30000
minutesToMs(5)     // 300000
hoursToMs(2)       // 7200000
```

### Parse Function

Parse duration string thành milliseconds.

```typescript
parseDuration("5m")                    // 300000
parseDuration("30s")                   // 30000
parseDuration("1h30m")                 // 5400000
parseDuration("5 minutes")             // 300000
parseDuration("2 hours 30 minutes")    // 9000000
```

## 💡 Use Cases

### 1. Settings Page - Display Intervals

```tsx
// Settings.tsx
import { formatDurationShort, formatDurationFull } from '../utils/timeFormat';

function Settings() {
  const config = { screenshotInterval: 300000, syncInterval: 60000 };
  
  return (
    <div>
      <p>
        Screenshot Interval: {formatDurationShort(config.screenshotInterval)}
        {" "}({formatDurationFull(config.screenshotInterval)})
      </p>
      {/* Output: "Screenshot Interval: 5 min (5 minutes)" */}
      
      <p>
        Sync Interval: {formatDurationShort(config.syncInterval)}
        {" "}({formatDurationFull(config.syncInterval)})
      </p>
      {/* Output: "Sync Interval: 1 min (1 minute)" */}
    </div>
  );
}
```

### 2. Time Tracker - Show Info

```tsx
// ModernTimeTracker.tsx
import { formatDurationShort } from '../utils/timeFormat';

function ModernTimeTracker() {
  const config = { screenshotInterval: 300000 };
  
  return (
    <p>
      Screenshots are captured every {formatDurationShort(config.screenshotInterval)} while tracking.
    </p>
    // Output: "Screenshots are captured every 5 min while tracking."
  );
}
```

### 3. Timer Display

```tsx
import { formatTimeHMS, formatDurationDetailed } from '../utils/timeFormat';

function Timer({ elapsedTime }) {
  return (
    <div>
      <div className="timer">{formatTimeHMS(elapsedTime)}</div>
      {/* Output: "01:01:05" */}
      
      <div className="elapsed">{formatDurationDetailed(elapsedTime)}</div>
      {/* Output: "1 hr 1 min 5 sec" */}
    </div>
  );
}
```

### 4. User Input Helper

```tsx
import { parseDuration, formatDurationShort } from '../utils/timeFormat';

function IntervalInput() {
  const [input, setInput] = useState("5m");
  const milliseconds = parseDuration(input);
  
  return (
    <div>
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. 5m, 30s, 1h30m"
      />
      <p>Preview: {formatDurationShort(milliseconds)}</p>
    </div>
  );
}
```

## 📊 Format Comparison

| Milliseconds | Short | Full | Minimal | Smart |
|-------------|-------|------|---------|-------|
| 10000 | 10 sec | 10 seconds | 10s | 10 sec |
| 30000 | 30 sec | 30 seconds | 30s | 30 sec |
| 60000 | 1 min | 1 minute | 1m | 1 min |
| 90000 | 1 min | 1 minute | 1m | 1 min 30 sec |
| 300000 | 5 min | 5 minutes | 5m | 5 min |
| 3600000 | 1 hr | 1 hour | 1h | 1 hr |
| 7200000 | 2 hrs | 2 hours | 2h | 2 hrs |
| 3665000 | 1 hr | 1 hour | 1h | 1 hr 1 min |

## 🎨 Format Options

### Format Types

**Short** (`"short"`)
- Compact, professional
- Use for UI labels, badges
- Examples: "5 min", "1 hr", "30 sec"

**Full** (`"full"`)
- Descriptive, readable
- Use for tooltips, descriptions
- Examples: "5 minutes", "1 hour", "30 seconds"

**Minimal** (`"minimal"`)
- Ultra-compact
- Use for charts, tight spaces
- Examples: "5m", "1h", "30s"

### Max Units

Control how many time units to display:

```typescript
const time = 3665000; // 1h 1m 5s

formatDuration(time, { maxUnits: 1 })  // "1 hr"
formatDuration(time, { maxUnits: 2 })  // "1 hr 1 min"
formatDuration(time, { maxUnits: 3 })  // "1 hr 1 min 5 sec"
```

## ✅ Applied Changes

### Files Updated

1. **Settings.tsx**
   - Screenshot interval display
   - Sync interval display

2. **ModernTimeTracker.tsx**
   - Screenshot interval info card

### Before & After

**Before:**
```tsx
{Math.floor((config.screenshotInterval || 300000) / 1000)}s
```

**After:**
```tsx
{formatDurationShort(config.screenshotInterval || 300000)}
```

## 🧪 Testing

Run examples and tests:

```typescript
import { runTests } from './utils/timeFormat.examples';

// Run all tests
const results = runTests();
console.log(`${results.passed}/${results.total} tests passed`);
```

## 🎯 Best Practices

### ✅ DO

```typescript
// ✅ Use appropriate format for context
<label>{formatDurationShort(interval)}</label>
<tooltip>{formatDurationFull(interval)}</tooltip>
<chart>{formatDurationMinimal(interval)}</chart>

// ✅ Show multiple units for better UX
formatDuration(time, { maxUnits: 2 })  // "1 hr 30 min"

// ✅ Use smart format for dynamic content
formatDurationSmart(unknownInterval)
```

### ❌ DON'T

```typescript
// ❌ Manual calculation
`${Math.floor(ms / 1000)}s`

// ❌ Hardcoded conversions
`${ms / 60000} minutes`

// ❌ Inconsistent formatting
`${hours}h ${minutes}m ${seconds}s`
```

## 🔮 Future Enhancements

Potential additions:

1. **Relative Time**
   ```typescript
   formatRelativeTime(timestamp)  // "5 minutes ago"
   ```

2. **Countdown Format**
   ```typescript
   formatCountdown(endTime)  // "5m 23s remaining"
   ```

3. **Range Format**
   ```typescript
   formatRange(start, end)  // "5 min - 1 hr"
   ```

4. **Localization**
   ```typescript
   formatDuration(ms, { locale: 'vi' })  // "5 phút"
   ```

## 📝 Notes

- All functions handle edge cases (0, negative, very large numbers)
- Performance optimized for frequent calls
- No external dependencies
- Type-safe with TypeScript
- Fully tested

## 🐛 Troubleshooting

**Q: Why is "1 min" showing instead of "60 sec"?**

A: The function automatically chooses the best unit. Use `formatDuration(ms, { maxUnits: 3 })` for more detail.

**Q: How to show "0 seconds" instead of "0 sec"?**

A: Use full format: `formatDurationFull(0)`

**Q: Can I customize the delimiter?**

A: Yes: `formatDuration(ms, { delimiter: ", " })` → "1 hr, 1 min"

## 📚 References

- Time Conversion: 1s = 1000ms, 1m = 60s, 1h = 60m
- Used in: Settings, TimeTracker, Reports, Logs
- Related: Date formatting, Timezone handling
