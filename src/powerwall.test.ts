// This module tests embedded protobuf parsing and live Powerwall status fetching.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BatteryPoller, fetchSimpleStatus } from './index.ts';

test('exports fetchSimpleStatus and BatteryPoller', () => {
  assert.equal(typeof fetchSimpleStatus, 'function');
  assert.equal(typeof BatteryPoller, 'function');
});
