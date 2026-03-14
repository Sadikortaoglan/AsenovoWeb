#!/usr/bin/env node

import axios from 'axios';

const DEFAULT_API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);

const tenants = [
  {
    name: 'tenant_a',
    baseUrl: process.env.TENANT_A_BASE_URL || DEFAULT_API_BASE_URL,
    token: process.env.TENANT_A_TOKEN || '',
    hostHeader: process.env.TENANT_A_HOST || '',
  },
  {
    name: 'tenant_b',
    baseUrl: process.env.TENANT_B_BASE_URL || DEFAULT_API_BASE_URL,
    token: process.env.TENANT_B_TOKEN || '',
    hostHeader: process.env.TENANT_B_HOST || '',
  },
].filter((tenant) => tenant.token);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildHeaders(tenant) {
  const headers = {
    Authorization: `Bearer ${tenant.token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (tenant.hostHeader) {
    headers.Host = tenant.hostHeader;
  }

  return headers;
}

function unwrapApiResponse(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
    assert(payload.success === true, payload.message || 'API returned success=false');
    return payload.data;
  }

  return payload;
}

function normalizeError(error) {
  if (error.response) {
    const details = typeof error.response.data === 'string'
      ? error.response.data
      : JSON.stringify(error.response.data);
    return `HTTP ${error.response.status}: ${details}`;
  }

  return error.message || String(error);
}

function buildCreatePayload(tenantName) {
  const uniqueSuffix = `${tenantName}-${Date.now()}`;
  return {
    identityNumber: `QA-${uniqueSuffix}`,
    buildingName: `QA Building ${tenantName}`,
    address: `QA Address ${tenantName}`,
    elevatorNumber: `E-${uniqueSuffix.slice(-6)}`,
    floorCount: 10,
    capacity: 630,
    speed: 1.6,
    technicalNotes: 'QA automated CRUD test record',
    driveType: 'TRACTION',
    machineBrand: 'Otis',
    doorType: 'AUTOMATIC',
    installationYear: 2022,
    serialNumber: `SN-${uniqueSuffix}`,
    controlSystem: 'MICROPROCESSOR',
    rope: '8x19',
    modernization: 'NONE',
    inspectionDate: '2026-01-15',
    labelDate: '2026-01-15',
    labelType: 'GREEN',
    expiryDate: '2027-01-15',
    managerName: 'QA Manager',
    managerTcIdentityNo: '12345678901',
    managerPhone: '05551234567',
    managerEmail: 'qa.manager@example.test',
  };
}

function buildUpdatePayload(originalPayload) {
  return {
    ...originalPayload,
    buildingName: `Updated ${originalPayload.buildingName}`,
    floorCount: 12,
    machineBrand: 'Kone',
    technicalNotes: 'QA automated CRUD test record updated',
  };
}

async function apiRequest(tenant, method, path, { data, params, validateStatus } = {}) {
  return axios({
    method,
    url: `${tenant.baseUrl}${path}`,
    headers: buildHeaders(tenant),
    data,
    params,
    timeout: REQUEST_TIMEOUT_MS,
    validateStatus: validateStatus || (() => true),
  });
}

async function createElevator(tenant, payload) {
  const response = await apiRequest(tenant, 'post', '/elevators', { data: payload });
  assert([200, 201].includes(response.status), `CREATE expected HTTP 200/201 but got ${response.status}`);

  const elevator = unwrapApiResponse(response.data);
  assert(elevator?.id, 'CREATE response did not contain elevator id');
  assert(elevator.identityNumber === payload.identityNumber, 'CREATE response identityNumber mismatch');

  return elevator;
}

async function readElevator(tenant, elevatorId, expectedPayload) {
  const response = await apiRequest(tenant, 'get', `/elevators/${elevatorId}`);
  assert(response.status === 200, `READ expected HTTP 200 but got ${response.status}`);

  const elevator = unwrapApiResponse(response.data);
  assert(elevator.id === elevatorId, 'READ response id mismatch');
  assert(elevator.identityNumber === expectedPayload.identityNumber, 'READ response identityNumber mismatch');
  assert(elevator.buildingName === expectedPayload.buildingName, 'READ response buildingName mismatch');
  assert(elevator.floorCount === expectedPayload.floorCount, 'READ response floorCount mismatch');

  return elevator;
}

async function listElevators(tenant, expectedPayload, forbiddenIdentityNumber) {
  const response = await apiRequest(tenant, 'get', '/elevators', {
    params: { page: 0, size: 10 },
  });
  assert(response.status === 200, `LIST expected HTTP 200 but got ${response.status}`);

  const elevators = unwrapApiResponse(response.data);
  assert(Array.isArray(elevators), 'LIST response data was not an array');
  assert(
    elevators.some((item) => item.identityNumber === expectedPayload.identityNumber),
    `LIST response did not contain elevator ${expectedPayload.identityNumber}`,
  );

  if (forbiddenIdentityNumber) {
    assert(
      elevators.every((item) => item.identityNumber !== forbiddenIdentityNumber),
      `LIST exposed foreign tenant elevator ${forbiddenIdentityNumber}`,
    );
  }

  return elevators;
}

async function verifyIsolation(sourceTenant, foreignTenants, sourceElevator) {
  for (const foreignTenant of foreignTenants) {
    const listResponse = await apiRequest(foreignTenant, 'get', '/elevators', {
      params: { page: 0, size: 50 },
    });
    assert(listResponse.status === 200, `ISOLATION LIST expected HTTP 200 but got ${listResponse.status}`);

    const elevators = unwrapApiResponse(listResponse.data);
    assert(Array.isArray(elevators), `ISOLATION list for ${foreignTenant.name} was not an array`);
    assert(
      elevators.every((item) => item.identityNumber !== sourceElevator.identityNumber),
      `Tenant isolation failed: ${foreignTenant.name} can list ${sourceElevator.identityNumber}`,
    );

    const getResponse = await apiRequest(foreignTenant, 'get', `/elevators/${sourceElevator.id}`);
    if (getResponse.status === 200) {
      const foreignElevator = unwrapApiResponse(getResponse.data);
      assert(
        foreignElevator.identityNumber !== sourceElevator.identityNumber,
        `Tenant isolation failed: ${foreignTenant.name} can read elevator ${sourceElevator.identityNumber}`,
      );
    } else {
      assert(
        [400, 403, 404].includes(getResponse.status),
        `ISOLATION READ expected HTTP 200/400/403/404 but got ${getResponse.status}`,
      );
    }
  }
}

async function updateElevator(tenant, elevatorId, updatePayload) {
  const response = await apiRequest(tenant, 'put', `/elevators/${elevatorId}`, { data: updatePayload });
  assert(response.status === 200, `UPDATE expected HTTP 200 but got ${response.status}`);

  const elevator = unwrapApiResponse(response.data);
  assert(elevator.id === elevatorId, 'UPDATE response id mismatch');
  assert(elevator.buildingName === updatePayload.buildingName, 'UPDATE response buildingName mismatch');
  assert(elevator.floorCount === updatePayload.floorCount, 'UPDATE response floorCount mismatch');
  assert(elevator.machineBrand === updatePayload.machineBrand, 'UPDATE response machineBrand mismatch');

  return elevator;
}

async function deleteElevator(tenant, elevatorId) {
  const response = await apiRequest(tenant, 'delete', `/elevators/${elevatorId}`);
  assert([200, 204].includes(response.status), `DELETE expected HTTP 200/204 but got ${response.status}`);

  if (response.status !== 204 && response.data) {
    unwrapApiResponse(response.data);
  }
}

async function verifyDeleted(tenant, elevatorId, identityNumber) {
  const getResponse = await apiRequest(tenant, 'get', `/elevators/${elevatorId}`);
  assert(
    [400, 404].includes(getResponse.status),
    `POST-DELETE READ expected HTTP 400/404 but got ${getResponse.status}`,
  );

  const listResponse = await apiRequest(tenant, 'get', '/elevators', {
    params: { page: 0, size: 50 },
  });
  assert(listResponse.status === 200, `POST-DELETE LIST expected HTTP 200 but got ${listResponse.status}`);

  const elevators = unwrapApiResponse(listResponse.data);
  assert(
    Array.isArray(elevators) && elevators.every((item) => item.identityNumber !== identityNumber),
    `POST-DELETE LIST still contains ${identityNumber}`,
  );
}

async function cleanupElevator(tenant, elevatorId) {
  if (!elevatorId) {
    return;
  }

  try {
    await deleteElevator(tenant, elevatorId);
  } catch (error) {
    console.error(`[WARN] Cleanup failed for ${tenant.name} elevator ${elevatorId}: ${normalizeError(error)}`);
  }
}

async function runCrudCycle(tenant, allTenants) {
  const foreignTenants = allTenants.filter((item) => item.name !== tenant.name);
  const createPayload = buildCreatePayload(tenant.name);
  const updatePayload = buildUpdatePayload(createPayload);

  let createdElevatorId = null;

  console.log(`Tenant: ${tenant.name}`);

  try {
    const createdElevator = await createElevator(tenant, createPayload);
    createdElevatorId = createdElevator.id;
    console.log('CREATE OK');

    await readElevator(tenant, createdElevatorId, createPayload);
    console.log('READ OK');

    await listElevators(tenant, createPayload);
    console.log('LIST OK');

    if (foreignTenants.length > 0) {
      await verifyIsolation(tenant, foreignTenants, createdElevator);
      console.log('ISOLATION OK');
    }

    await updateElevator(tenant, createdElevatorId, updatePayload);
    console.log('UPDATE OK');

    await deleteElevator(tenant, createdElevatorId);
    console.log('DELETE OK');
    await verifyDeleted(tenant, createdElevatorId, createPayload.identityNumber);

    createdElevatorId = null;
  } catch (error) {
    throw new Error(`${tenant.name} failed: ${normalizeError(error)}`);
  } finally {
    await cleanupElevator(tenant, createdElevatorId);
  }
}

async function main() {
  assert(tenants.length > 0, 'Configure at least one tenant token via TENANT_A_TOKEN / TENANT_B_TOKEN.');

  for (const tenant of tenants) {
    await runCrudCycle(tenant, tenants);
  }

  console.log(`Completed CRUD test cycle for ${tenants.length} tenant(s).`);
}

main().catch((error) => {
  console.error(`\n[FAIL] ${error.message}`);
  process.exit(1);
});
