import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ValidationPipe, UseGuards } from '@nestjs/common';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { CompetitionsService } from './competitions.service';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { AdminGuard } from 'src/guards/admin.guard';

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  // GET /competitions?region=Region
  @Get()
  async getCompetitions(@Query('region') region: string) {
    console.log('Getting competitions');
    return await this.competitionsService.getCompetitions(region);
  }

  // GET /competitions/:id
  @Get(':id')
  async getCompetition(@Param('id') competitionId: string) {
    console.log(`Getting competition with id ${competitionId}`);
    return await this.competitionsService.getCompetition(competitionId);
  }

  // POST /competitions
  @Post()
  @UseGuards(AdminGuard)
  async createCompetition(@Body(new ValidationPipe()) createCompetitionDto: CreateCompetitionDto) {
    console.log('Creating competition');
    return await this.competitionsService.createCompetition(createCompetitionDto);
  }

  // PATCH /competitions/:id
  @Patch(':id')
  @UseGuards(AdminGuard)
  async updateCompetition(
    @Param('id') competitionId: string,
    @Body(new ValidationPipe()) updateCompetitionDto: UpdateCompetitionDto,
  ) {
    console.log('Updating competition');
    return await this.competitionsService.updateCompetition(competitionId, updateCompetitionDto);
  }

  // DELETE /competitions/:id
  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteCompetition(@Param('id') competitionId: string) {
    console.log(`Deleting competition with id ${competitionId}`);
    return await this.competitionsService.deleteCompetition(competitionId);
  }
}
