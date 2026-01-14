import { useState } from "react";
import {
  formatDuration,
  formatDurationDetailed,
  formatDurationFull,
  formatDurationMinimal,
  formatDurationShort,
  formatDurationSmart,
  formatTimeHMS,
  parseDuration,
  type DurationFormat,
} from "../utils/timeFormat";
import { Icons } from "./Icons";

/**
 * Interactive demo component để test time formatting utilities
 * Có thể dùng trong Settings hoặc Developer Tools
 */
function TimeFormatDemo() {
  const [milliseconds, setMilliseconds] = useState(300000); // 5 minutes default
  const [format, setFormat] = useState<DurationFormat>("short");
  const [maxUnits, setMaxUnits] = useState(1);
  const [parseInput, setParseInput] = useState("5m");

  const presets = [
    { label: "10 seconds", value: 10000 },
    { label: "30 seconds", value: 30000 },
    { label: "1 minute", value: 60000 },
    { label: "5 minutes", value: 300000 },
    { label: "10 minutes", value: 600000 },
    { label: "30 minutes", value: 1800000 },
    { label: "1 hour", value: 3600000 },
    { label: "1h 30m", value: 5400000 },
    { label: "2 hours", value: 7200000 },
    { label: "8 hours", value: 28800000 },
  ];

  const parsedValue = parseDuration(parseInput);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          Time Format Utilities Demo
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Interactive playground để test time formatting functions
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4 border border-gray-200 dark:border-transparent">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Input
        </h3>

        {/* Milliseconds Input */}
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Milliseconds
          </label>
          <input
            type="number"
            value={milliseconds}
            onChange={(e) => setMilliseconds(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            step="1000"
          />
        </div>

        {/* Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setMilliseconds(preset.value)}
                className={`px-3 py-2 rounded-lg text-sm transition ${
                  milliseconds === preset.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as DurationFormat)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            >
              <option value="short">Short (5 min)</option>
              <option value="full">Full (5 minutes)</option>
              <option value="minimal">Minimal (5m)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Max Units
            </label>
            <select
              value={maxUnits}
              onChange={(e) => setMaxUnits(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            >
              <option value="1">1 unit</option>
              <option value="2">2 units</option>
              <option value="3">3 units</option>
            </select>
          </div>
        </div>
      </div>

      {/* Output Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4 border border-gray-200 dark:border-transparent">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Output
        </h3>

        <div className="space-y-3">
          <OutputRow
            label="formatDuration (custom)"
            value={formatDuration(milliseconds, { format, maxUnits })}
          />
          <OutputRow
            label="formatDurationShort"
            value={formatDurationShort(milliseconds)}
          />
          <OutputRow
            label="formatDurationFull"
            value={formatDurationFull(milliseconds)}
          />
          <OutputRow
            label="formatDurationMinimal"
            value={formatDurationMinimal(milliseconds)}
          />
          <OutputRow
            label="formatDurationSmart"
            value={formatDurationSmart(milliseconds)}
          />
          <OutputRow
            label="formatDurationDetailed"
            value={formatDurationDetailed(milliseconds)}
          />
          <OutputRow
            label="formatTimeHMS"
            value={formatTimeHMS(milliseconds)}
          />
        </div>
      </div>

      {/* Parse Duration Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4 border border-gray-200 dark:border-transparent">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Parse Duration String
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Input String (e.g., "5m", "1h30m", "5 minutes")
          </label>
          <input
            type="text"
            value={parseInput}
            onChange={(e) => setParseInput(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            placeholder="5m"
          />
        </div>

        <OutputRow label="Parsed (ms)" value={parsedValue.toString()} />
        <OutputRow label="Formatted" value={formatDurationShort(parsedValue)} />

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Supported formats: "5m", "30s", "2h", "1h30m45s"</p>
          <p>• Words: "5 minutes", "2 hours", "30 seconds"</p>
          <p>• Mixed: "2 hours 30 minutes"</p>
        </div>
      </div>

      {/* Examples Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-transparent">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Common Use Cases
        </h3>

        <div className="space-y-4">
          <ExampleCard
            title="Screenshot Interval"
            input="300000ms (5 minutes)"
            outputs={[
              { label: "Display", value: formatDurationShort(300000) },
              { label: "Full", value: formatDurationFull(300000) },
            ]}
          />

          <ExampleCard
            title="Sync Interval"
            input="60000ms (1 minute)"
            outputs={[
              { label: "Display", value: formatDurationShort(60000) },
              { label: "Full", value: formatDurationFull(60000) },
            ]}
          />

          <ExampleCard
            title="Elapsed Time"
            input="3665000ms (1h 1m 5s)"
            outputs={[
              { label: "Timer", value: formatTimeHMS(3665000) },
              { label: "Short", value: formatDurationShort(3665000) },
              { label: "Detailed", value: formatDurationDetailed(3665000) },
            ]}
          />
        </div>
      </div>

      {/* Code Examples */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-transparent">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Code Example
        </h3>

        <pre className="bg-gray-100 dark:bg-gray-900 text-green-600 dark:text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{`import { formatDurationShort } from './utils/timeFormat';

// In your component:
const screenshotInterval = ${milliseconds};

<p>
  Every {formatDurationShort(screenshotInterval)}
</p>
// Output: "Every ${formatDurationShort(milliseconds)}"`}</code>
        </pre>
      </div>
    </div>
  );
}

// Helper Components

function OutputRow({ label, value }: { label: string; value: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-gray-900 dark:text-white font-semibold">
          {value}
        </span>
        <button
          onClick={copyToClipboard}
          className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
          title="Copy to clipboard"
        >
          <Icons.Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ExampleCard({
  title,
  input,
  outputs,
}: {
  title: string;
  input: string;
  outputs: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">{input}</p>
      <div className="space-y-2">
        {outputs.map((output, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {output.label}:
            </span>
            <span className="text-gray-900 dark:text-white font-mono">
              {output.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TimeFormatDemo;
