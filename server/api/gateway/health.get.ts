import { getGatewayHealth } from '../../utils/gateway';

export default defineEventHandler(() => {
  return getGatewayHealth();
});
