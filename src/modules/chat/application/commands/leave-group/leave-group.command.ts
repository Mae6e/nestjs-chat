export class LeaveGroupCommand {
  constructor(
    public readonly conversationId: string,
    public readonly userId: string,
  ) {}
}

export class LeaveGroupResult {
  constructor(
    public readonly removed: boolean,
    /**
     * User promoted to ADMIN as a result of the last admin leaving, when any.
     */
    public readonly promotedAdminId?: string,
    /**
     * True when the leaving member was the last active member and the group
     * conversation was deleted.
     */
    public readonly conversationDeleted: boolean = false,
  ) {}
}
