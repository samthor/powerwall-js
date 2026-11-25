// This module queries the local Tesla Powerwall TEDAPI using protobufjs over HTTPS.

import https from 'node:https';
import protobuf from 'protobufjs';

const TEDAPI_PROTO = `
syntax = "proto3";
package tedapi;

message Message {
  MessageEnvelope message = 1;
  Tail tail = 2;
}

message MessageEnvelope {
  int32 deliveryChannel = 1;
  Participant sender = 2;
  Participant recipient = 3;
  ConfigType config = 15;
  QueryType payload = 16;
}

message Participant {
  oneof id {
    string din = 1;
    int32 teslaService = 2;
    int32 local = 3;
    int32 authorizedClient = 4;
  }
}

message Tail {
  int32 value = 1;
}

message QueryType {
  PayloadQuerySend send = 1;
  PayloadString recv = 2;
}

message PayloadQuerySend {
  optional int32 num = 1;
  PayloadString payload = 2;
  bytes code = 3;
  StringValue b = 4;
}

message ConfigType {
  oneof config {
    PayloadConfigSend send = 1;
    PayloadConfigRecv recv = 2;
  }
}

message PayloadConfigSend {
  int32 num = 1;
  string file = 2;
}

message PayloadConfigRecv {
  ConfigString file = 1;
  bytes code = 2;
}

message ConfigString {
  string name = 1;
  string text = 100;
}

message PayloadString {
  int32 value = 1;
  string text = 2;
}

message StringValue {
  string value = 1;
}
`;

const protoRoot = protobuf.parse(TEDAPI_PROTO).root;
const MessageProto = protoRoot.lookupType('tedapi.Message');

const DEFAULT_REMOTE = '192.168.91.1:443';

const QUERY_STATUS_TEXT = ` query DeviceControllerQuery {
  control {
    systemStatus {
        nominalFullPackEnergyWh
        nominalEnergyRemainingWh
    }
    islanding {
        customerIslandMode
        contactorClosed
        microGridOK
        gridOK
    }
    meterAggregates {
      location
      realPowerW
    }
    alerts {
      active
    },
    siteShutdown {
      isShutDown
      reasons
    }
    batteryBlocks {
      din
      disableReasons
    }
    pvInverters {
      din
      disableReasons
    }
  }
  system {
    time
    sitemanagerStatus {
      isRunning
    }
    updateUrgencyCheck  {
      urgency
      version {
        version
        gitHash
      }
      timestamp
    }
  }
  neurio {
    isDetectingWiredMeters
    readings {
      serial
      dataRead {
        voltageV
        realPowerW
        reactivePowerVAR
        currentA
      }
      timestamp
    }
    pairings {
      serial
      shortId
      status
      errors
      macAddress
      isWired
      modbusPort
      modbusId
      lastUpdateTimestamp
    }
  }
  pw3Can {
    firmwareUpdate {
      isUpdating
      progress {
         updating
         numSteps
         currentStep
         currentStepProgress
         progress
      }
    }
  }
  esCan {
    bus {
      PVAC {
        packagePartNumber
        packageSerialNumber
        subPackagePartNumber
        subPackageSerialNumber
        PVAC_Status {
          isMIA
          PVAC_Pout
          PVAC_State
          PVAC_Vout
          PVAC_Fout
        }
        PVAC_InfoMsg {
          PVAC_appGitHash
        }
        PVAC_Logging {
          isMIA
          PVAC_PVCurrent_A
          PVAC_PVCurrent_B
          PVAC_PVCurrent_C
          PVAC_PVCurrent_D
          PVAC_PVMeasuredVoltage_A
          PVAC_PVMeasuredVoltage_B
          PVAC_PVMeasuredVoltage_C
          PVAC_PVMeasuredVoltage_D
          PVAC_VL1Ground
          PVAC_VL2Ground
        }
        alerts {
          isComplete
          isMIA
          active
        }
      }
      PINV {
        PINV_Status {
          isMIA
          PINV_Fout
          PINV_Pout
          PINV_Vout
          PINV_State
          PINV_GridState
        }
        PINV_AcMeasurements {
          isMIA
          PINV_VSplit1
          PINV_VSplit2
        }
        PINV_PowerCapability {
          isComplete
          isMIA
          PINV_Pnom
        }
        alerts {
          isComplete
          isMIA
          active
        }
      }
      PVS {
        PVS_Status {
          isMIA
          PVS_State
          PVS_vLL
          PVS_StringA_Connected
          PVS_StringB_Connected
          PVS_StringC_Connected
          PVS_StringD_Connected
          PVS_SelfTestState
        }
        alerts {
          isComplete
          isMIA
          active
        }
      }
      THC {
        packagePartNumber
        packageSerialNumber
        THC_InfoMsg {
          isComplete
          isMIA
          THC_appGitHash
        }
        THC_Logging {
          THC_LOG_PW_2_0_EnableLineState
        }
      }
      POD {
        POD_EnergyStatus {
          isMIA
          POD_nom_energy_remaining
          POD_nom_full_pack_energy
        }
        POD_InfoMsg {
            POD_appGitHash
        }
      }
      MSA {
        packagePartNumber
        packageSerialNumber
        MSA_InfoMsg {
          isMIA
          MSA_appGitHash
          MSA_assemblyId
        }
        METER_Z_AcMeasurements {
          isMIA
          lastRxTime
          METER_Z_CTA_InstRealPower
          METER_Z_CTA_InstReactivePower
          METER_Z_CTA_I
          METER_Z_VL1G
          METER_Z_CTB_InstRealPower
          METER_Z_CTB_InstReactivePower
          METER_Z_CTB_I
          METER_Z_VL2G
        }
        MSA_Status {
          lastRxTime
        }
      }
      SYNC {
        packagePartNumber
        packageSerialNumber
        SYNC_InfoMsg {
          isMIA
          SYNC_appGitHash
        }
        METER_X_AcMeasurements {
          isMIA
          isComplete
          lastRxTime
          METER_X_CTA_InstRealPower
          METER_X_CTA_InstReactivePower
          METER_X_CTA_I
          METER_X_VL1N
          METER_X_CTB_InstRealPower
          METER_X_CTB_InstReactivePower
          METER_X_CTB_I
          METER_X_VL2N
          METER_X_CTC_InstRealPower
          METER_X_CTC_InstReactivePower
          METER_X_CTC_I
          METER_X_VL3N
        }
        METER_Y_AcMeasurements {
          isMIA
          isComplete
          lastRxTime
          METER_Y_CTA_InstRealPower
          METER_Y_CTA_InstReactivePower
          METER_Y_CTA_I
          METER_Y_VL1N
          METER_Y_CTB_InstRealPower
          METER_Y_CTB_InstReactivePower
          METER_Y_CTB_I
          METER_Y_VL2N
          METER_Y_CTC_InstRealPower
          METER_Y_CTC_InstReactivePower
          METER_Y_CTC_I
          METER_Y_VL3N
        }
        SYNC_Status {
          lastRxTime
        }
      }
      ISLANDER {
        ISLAND_GridConnection {
          ISLAND_GridConnected
          isComplete
        }
        ISLAND_AcMeasurements {
          ISLAND_VL1N_Main
          ISLAND_FreqL1_Main
          ISLAND_VL2N_Main
          ISLAND_FreqL2_Main
          ISLAND_VL3N_Main
          ISLAND_FreqL3_Main
          ISLAND_VL1N_Load
          ISLAND_FreqL1_Load
          ISLAND_VL2N_Load
          ISLAND_FreqL2_Load
          ISLAND_VL3N_Load
          ISLAND_FreqL3_Load
          ISLAND_GridState
          lastRxTime
          isComplete
          isMIA
        }
      }
    }
    enumeration {
      inProgress
      numACPW
      numPVI
    }
    firmwareUpdate {
      isUpdating
      powerwalls {
        updating
        numSteps
        currentStep
        currentStepProgress
        progress
      }
      msa {
        updating
        numSteps
        currentStep
        currentStepProgress
        progress
      }
      sync {
        updating
        numSteps
        currentStep
        currentStepProgress
        progress
      }
      pvInverters {
        updating
        numSteps
        currentStep
        currentStepProgress
        progress
      }
    }
    phaseDetection {
      inProgress
      lastUpdateTimestamp
      powerwalls {
        din
        progress
        phase
      }
    }
    inverterSelfTests {
      isRunning
      isCanceled
      pinvSelfTestsResults {
        din
        overall {
          status
          test
          summary
          setMagnitude
          setTime
          tripMagnitude
          tripTime
          accuracyMagnitude
          accuracyTime
          currentMagnitude
          timestamp
          lastError
        }
        testResults {
          status
          test
          summary
          setMagnitude
          setTime
          tripMagnitude
          tripTime
          accuracyMagnitude
          accuracyTime
          currentMagnitude
          timestamp
          lastError
        }
      }
    }
  }
}
`;

const QUERY_STATUS_SIG = Buffer.from(
  'MIGGAkEUsZelf621utFyGqi9asUYmDC2EkKitHBPshR2ZLfOGgz+0lYBDH8q9uXbZ18vYAsWlV9xYxMk0455vn7dQTESeAJBcAdftB9dxD7y7gWlVsF/KgjHDqZdH4Ki60l+2s8R3gYbcc/JtM38HvVzupWNI28hzXrr5XqW9eEMta5y+8svFx8=',
  'base64',
);

export type SimplePhase = {
  freqLoad: number;
  freqMain: number;
  voltageLoad: number;
  voltageMain: number;
};

export type DataBattery = {
  dinLeader: string;
  shutdown: boolean;
  island: boolean;
  battery: number;
  batteryFull: number;
  powerBattery: number;
  powerSite: number;
  powerLoad: number;
  powerSolar: number;
  powerSolarRGM: number;
  powerGenerator: number;
  powerConductor: number;
  batteryBlocks: string[];
  phase: [SimplePhase, SimplePhase, SimplePhase];
};

export type TedApiConfig = {
  din: string;
  secret: string;
  remote?: string;
};

const unsafeAgent = new https.Agent({
  rejectUnauthorized: false,
});

function tedRequest(
  signal: AbortSignal,
  config: TedApiConfig,
  pathname: string,
  body?: Uint8Array,
): Promise<Buffer> {
  const remote = config.remote || DEFAULT_REMOTE;
  const [hostname, portStr] = remote.split(':');
  const port = portStr ? Number.parseInt(portStr, 10) : 443;
  const auth = Buffer.from(`Tesla_Energy_Device:${config.secret}`).toString('base64url');

  return new Promise<Buffer>((resolvePromise, rejectPromise) => {
    const req = https.request(
      {
        hostname,
        port,
        path: pathname,
        method: body ? 'POST' : 'GET',
        agent: unsafeAgent,
        signal,
        headers: {
          Authorization: `Basic ${auth}`,
          ...(body ? { 'Content-Length': body.byteLength } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            rejectPromise(new Error(`non-200 status from Powerwall: ${res.statusCode}`));
            return;
          }
          resolvePromise(Buffer.concat(chunks));
        });
      },
    );

    req.on('error', rejectPromise);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

type RawPowerwallStatusResponse = {
  control: {
    batteryBlocks?: {
      din: string;
    }[];
    islanding: {
      contactorClosed: boolean;
    };
    meterAggregates?: {
      location: string;
      realPowerW: number;
    }[];
    siteShutdown: {
      isShutDown: boolean;
    };
    systemStatus: {
      nominalEnergyRemainingWh: number;
      nominalFullPackEnergyWh: number;
    };
  };
  esCan?: {
    bus?: {
      ISLANDER?: {
        ISLAND_AcMeasurements?: Record<string, unknown>;
      };
    };
  };
};

// This function queries the Powerwall leader for its current SimpleStatus.
export async function fetchSimpleStatus(
  signal: AbortSignal,
  config: TedApiConfig,
): Promise<DataBattery> {
  const payloadObj = {
    message: {
      deliveryChannel: 1,
      sender: { local: 1 },
      recipient: { din: config.din },
      payload: {
        send: {
          num: 2,
          payload: { value: 1, text: QUERY_STATUS_TEXT },
          code: QUERY_STATUS_SIG,
          b: { value: '{}' },
        },
      },
    },
    tail: { value: 1 },
  };

  const encoded = MessageProto.encode(MessageProto.fromObject(payloadObj)).finish();
  const resBytes = await tedRequest(signal, config, '/tedapi/v1', encoded);
  const decoded = MessageProto.toObject(MessageProto.decode(resBytes)) as {
    message?: {
      payload?: {
        recv?: {
          text?: string;
        };
      };
    };
  };

  const jsonText = decoded.message?.payload?.recv?.text;
  if (!jsonText) {
    throw new Error('missing result JSON from Powerwall protobuf response');
  }

  const parsed = JSON.parse(jsonText) as RawPowerwallStatusResponse;
  const aggregates = parsed.control.meterAggregates ?? [];
  const powerFor = (loc: string): number => {
    const found = aggregates.find((m) => m.location === loc);
    return found ? found.realPowerW : 0;
  };

  const ac = parsed.esCan?.bus?.ISLANDER?.ISLAND_AcMeasurements ?? {};
  const floatFor = (key: string): number => {
    const val = ac[key];
    return typeof val === 'number' ? val : 0;
  };

  const phase: [SimplePhase, SimplePhase, SimplePhase] = [1, 2, 3].map((p) => ({
    freqLoad: floatFor(`ISLAND_FreqL${p}_Load`),
    freqMain: floatFor(`ISLAND_FreqL${p}_Main`),
    voltageLoad: floatFor(`ISLAND_VL${p}N_Load`),
    voltageMain: floatFor(`ISLAND_VL${p}N_Main`),
  })) as [SimplePhase, SimplePhase, SimplePhase];

  return {
    dinLeader: config.din,
    shutdown: Boolean(parsed.control.siteShutdown?.isShutDown),
    island: !parsed.control.islanding?.contactorClosed,
    battery: Math.trunc(parsed.control.systemStatus.nominalEnergyRemainingWh),
    batteryFull: Math.trunc(parsed.control.systemStatus.nominalFullPackEnergyWh),
    powerBattery: powerFor('BATTERY'),
    powerSite: powerFor('SITE'),
    powerLoad: powerFor('LOAD'),
    powerSolar: powerFor('SOLAR'),
    powerSolarRGM: powerFor('SOLAR_RGM'),
    powerGenerator: powerFor('GENERATOR'),
    powerConductor: powerFor('CONDUCTOR'),
    batteryBlocks: (parsed.control.batteryBlocks ?? []).map((b) => b.din),
    phase,
  };
}
