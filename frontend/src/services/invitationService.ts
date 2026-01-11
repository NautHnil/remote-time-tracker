/**
 * Invitation Service
 * Handles invitation-related API calls
 */

import { apiClient } from "./apiClient";
import type { Invitation } from "./organizationService";

// ============================================================================
// TYPES
// ============================================================================

export interface AcceptInvitationRequest {
  token: string;
}

export interface InvitationDetails extends Invitation {
  can_accept: boolean;
  is_expired: boolean;
}

// ============================================================================
// INVITATION SERVICE
// ============================================================================

class InvitationService {
  /**
   * Get invitation by token (public)
   */
  async getByToken(token: string): Promise<InvitationDetails> {
    const response = await apiClient.get<InvitationDetails>(
      `/invitations/${token}`
    );
    return response.data;
  }

  /**
   * Accept invitation (public - for registration flow)
   */
  async acceptByToken(data: AcceptInvitationRequest): Promise<void> {
    await apiClient.post("/invitations/accept", data);
  }

  /**
   * Get my pending invitations
   */
  async getMyInvitations(): Promise<Invitation[]> {
    const response = await apiClient.get<Invitation[]>("/invitations/my");
    return response.data || [];
  }
}

// Export singleton instance
export const invitationService = new InvitationService();

// Export class for testing
export { InvitationService };

// Backward compatible alias
export const invitationAPI = invitationService;
