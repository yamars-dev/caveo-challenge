import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
@Entity({name: 'user'})
export class UserEntity {


  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column()
  role!: string;

  @Column({name: 'is_onboarded', default: false})
  isOnboarded!: boolean;

  @CreateDateColumn({name: 'created_at'})
  createdAt!: Date;

  @UpdateDateColumn({name: 'updated_at'})
  updatedAt!: Date;

  @DeleteDateColumn({name: 'deleted_at'})
  deletedAt!: Date;


}