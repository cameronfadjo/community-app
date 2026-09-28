'use client';

import { useState } from 'react';
import { format } from 'date-fns';

export const hourLabel = (hour: number) => format(new Date(2000, 0, 1, hour), 'h a');

/**
 * A single series, so one color and no legend. The numbers are in the
 * table beneath for anyone who can't use the chart.
 */
export function Bars({
  title,
  items,
  everyNthLabel,
}: {
  title: string;
  items: Array<{ key: string; label: string; detail: string; value: number }>;
  everyNthLabel: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(...items.map((item) => item.value), 1);
  const active = items.find((item) => item.key === hovered);

  return (
    <figure className="m-0">
      <figcaption className="flex items-baseline justify-between gap-4 mb-3">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-sm text-gray-600" aria-live="polite">
          {active ? `${active.detail}: ${active.value}` : `Most in one: ${max}`}
        </span>
      </figcaption>

      <div
        className="flex items-end gap-[2px] h-40 border-b border-gray-300"
        role="img"
        aria-label={`${title}. The numbers are in the table below.`}
      >
        {items.map((item) => (
          <div
            key={item.key}
            className="flex-1 h-full flex items-end cursor-default"
            onMouseEnter={() => setHovered(item.key)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className={`w-full rounded-t ${hovered === item.key ? 'bg-purple-800' : 'bg-purple-600'}`}
              style={{ height: item.value === 0 ? 0 : `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-[2px] mt-1" aria-hidden="true">
        {items.map((item, index) => (
          <div key={item.key} className="flex-1 text-center text-xs text-gray-600 whitespace-nowrap overflow-visible">
            {index % everyNthLabel === 0 ? item.label : ''}
          </div>
        ))}
      </div>

      <details className="mt-3">
        <summary className="text-sm text-purple-700 font-medium cursor-pointer">
          Show as a table
        </summary>
        <table className="mt-2 text-sm w-full max-w-xs">
          <tbody>
            {items
              .filter((item) => item.value > 0)
              .map((item) => (
                <tr key={item.key} className="border-b border-gray-200">
                  <th scope="row" className="text-left font-normal text-gray-700 py-1">
                    {item.detail}
                  </th>
                  <td className="text-right text-gray-900 py-1 tabular-nums">{item.value}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function Funnel({ steps }: { steps: Array<{ step: string; count: number }> }) {
  const max = Math.max(...steps.map((step) => step.count), 1);
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.step}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-gray-700">{step.step}</span>
            <span className="font-semibold text-gray-900 tabular-nums">{step.count}</span>
          </div>
          <div className="mt-1 h-3 rounded bg-gray-100">
            <div
              className="h-3 rounded bg-purple-600"
              style={{ width: step.count === 0 ? 0 : `${Math.max((step.count / max) * 100, 1)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CountsTable({
  firstHeading,
  rows,
}: {
  firstHeading: string;
  rows: Array<{
    key: string;
    name: string;
    note: string;
    views: number;
    saves: number;
    directions: number;
    perkViews: number;
    perkUnlocked: number;
    perkRedeemed: number;
  }>;
}) {
  const number = 'px-3 py-3 text-right tabular-nums text-gray-900';
  const heading = 'px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th
              scope="col"
              className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              {firstHeading}
            </th>
            <th scope="col" className={heading}>Views</th>
            <th scope="col" className={heading}>Saved</th>
            <th scope="col" className={heading}>Directions</th>
            <th scope="col" className={heading}>Went for perk</th>
            <th scope="col" className={heading}>Unlocked</th>
            <th scope="col" className={heading}>Used</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-200">
              <th scope="row" className="py-3 pr-3 text-left font-normal">
                <span className="block font-medium text-gray-900">{row.name}</span>
                <span className="block text-gray-600">{row.note}</span>
              </th>
              <td className={number}>{row.views}</td>
              <td className={number}>{row.saves}</td>
              <td className={number}>{row.directions}</td>
              <td className={number}>{row.perkViews}</td>
              <td className={number}>{row.perkUnlocked}</td>
              <td className={number}>{row.perkRedeemed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
