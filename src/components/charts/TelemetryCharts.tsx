/**
 * Telemetry charts component using ECharts
 * Displays altitude, speed, battery, and attitude data
 * Optimized for performance with large datasets
 */

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TelemetryData } from '@/types';

interface TelemetryChartsProps {
  data: TelemetryData;
}

export function TelemetryCharts({ data }: TelemetryChartsProps) {
  // Memoize chart options to prevent unnecessary re-renders
  const altitudeSpeedOption = useMemo(
    () => createAltitudeSpeedChart(data),
    [data]
  );
  const batteryOption = useMemo(() => createBatteryChart(data), [data]);
  const attitudeOption = useMemo(() => createAttitudeChart(data), [data]);

  return (
    <div className="space-y-4">
      {/* Altitude & Speed Chart */}
      <div className="h-48">
        <ReactECharts
          option={altitudeSpeedOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
        />
      </div>

      {/* Battery Chart */}
      <div className="h-36">
        <ReactECharts
          option={batteryOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
        />
      </div>

      {/* Attitude Chart */}
      <div className="h-40">
        <ReactECharts
          option={attitudeOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
        />
      </div>
    </div>
  );
}

/** Shared chart configuration for performance */
const baseChartConfig: Partial<EChartsOption> = {
  animation: false, // Disable for large datasets
  grid: {
    left: 50,
    right: 20,
    top: 30,
    bottom: 30,
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#16213e',
    borderColor: '#4a4e69',
    textStyle: {
      color: '#fff',
    },
    axisPointer: {
      type: 'cross',
      lineStyle: {
        color: '#4a4e69',
      },
    },
  },
  legend: {
    textStyle: {
      color: '#9ca3af',
    },
    top: 0,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    axisLine: {
      lineStyle: {
        color: '#4a4e69',
      },
    },
    axisLabel: {
      color: '#9ca3af',
      formatter: (value: string) => {
        const secs = parseFloat(value);
        const mins = Math.floor(secs / 60);
        const remainingSecs = Math.floor(secs % 60);
        return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
      },
    },
    splitLine: {
      show: false,
    },
  },
};

function createAltitudeSpeedChart(data: TelemetryData): EChartsOption {
  return {
    ...baseChartConfig,
    legend: {
      ...baseChartConfig.legend,
      data: ['Altitude', 'Speed'],
    },
    xAxis: {
      ...baseChartConfig.xAxis,
      data: data.time.map((t) => t.toFixed(1)),
    },
    yAxis: [
      {
        type: 'value',
        name: 'Altitude (m)',
        nameTextStyle: {
          color: '#00A0DC',
        },
        axisLine: {
          lineStyle: {
            color: '#00A0DC',
          },
        },
        axisLabel: {
          color: '#9ca3af',
        },
        splitLine: {
          lineStyle: {
            color: '#2a2a4e',
          },
        },
      },
      {
        type: 'value',
        name: 'Speed (m/s)',
        nameTextStyle: {
          color: '#00D4AA',
        },
        axisLine: {
          lineStyle: {
            color: '#00D4AA',
          },
        },
        axisLabel: {
          color: '#9ca3af',
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: 'Altitude',
        type: 'line',
        data: data.altitude,
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#00A0DC',
          width: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 160, 220, 0.3)' },
              { offset: 1, color: 'rgba(0, 160, 220, 0.05)' },
            ],
          },
        },
      },
      {
        name: 'Speed',
        type: 'line',
        data: data.speed,
        yAxisIndex: 1,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#00D4AA',
          width: 2,
        },
      },
    ],
  };
}

function createBatteryChart(data: TelemetryData): EChartsOption {
  return {
    ...baseChartConfig,
    legend: {
      ...baseChartConfig.legend,
      data: ['Battery'],
    },
    xAxis: {
      ...baseChartConfig.xAxis,
      data: data.time.map((t) => t.toFixed(1)),
    },
    yAxis: {
      type: 'value',
      name: 'Battery %',
      min: 0,
      max: 100,
      axisLine: {
        lineStyle: {
          color: '#4a4e69',
        },
      },
      axisLabel: {
        color: '#9ca3af',
      },
      splitLine: {
        lineStyle: {
          color: '#2a2a4e',
        },
      },
    },
    series: [
      {
        name: 'Battery',
        type: 'line',
        data: data.battery,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#f59e0b',
          width: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
            ],
          },
        },
        markLine: {
          silent: true,
          data: [
            {
              yAxis: 20,
              lineStyle: {
                color: '#ef4444',
                type: 'dashed',
              },
              label: {
                formatter: 'Low Battery',
                color: '#ef4444',
              },
            },
          ],
        },
      },
    ],
  };
}

function createAttitudeChart(data: TelemetryData): EChartsOption {
  return {
    ...baseChartConfig,
    legend: {
      ...baseChartConfig.legend,
      data: ['Pitch', 'Roll', 'Yaw'],
    },
    xAxis: {
      ...baseChartConfig.xAxis,
      data: data.time.map((t) => t.toFixed(1)),
    },
    yAxis: {
      type: 'value',
      name: 'Degrees',
      axisLine: {
        lineStyle: {
          color: '#4a4e69',
        },
      },
      axisLabel: {
        color: '#9ca3af',
      },
      splitLine: {
        lineStyle: {
          color: '#2a2a4e',
        },
      },
    },
    series: [
      {
        name: 'Pitch',
        type: 'line',
        data: data.pitch,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#8b5cf6',
          width: 1.5,
        },
      },
      {
        name: 'Roll',
        type: 'line',
        data: data.roll,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#ec4899',
          width: 1.5,
        },
      },
      {
        name: 'Yaw',
        type: 'line',
        data: data.yaw,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#14b8a6',
          width: 1.5,
        },
      },
    ],
  };
}
