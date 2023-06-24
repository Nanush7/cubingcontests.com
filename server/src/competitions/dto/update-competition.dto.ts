import { PartialType } from '@nestjs/mapped-types';
import { CreateCompetitionDto } from './create-competition.dto';
import { IsNumber, IsOptional } from 'class-validator';
import { IRoundBase } from '@sh/interfaces/Round';

export class UpdateCompetitionDto extends PartialType(CreateCompetitionDto) {
  // ADD VALIDATION(?)
  @IsOptional()
  events?: {
    eventId: string;
    rounds: IRoundBase[];
  }[];
}
