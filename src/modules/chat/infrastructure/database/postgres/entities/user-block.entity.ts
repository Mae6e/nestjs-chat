import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'chat', name: 'user_blocks' })
export class UserBlock {
  @PrimaryColumn({ type: 'char', length: 24 })
  blocker_id: string;

  @PrimaryColumn({ type: 'char', length: 24 })
  blocked_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deleted_at: Date | null;
}
