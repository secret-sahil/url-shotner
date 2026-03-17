import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common';
import { ShortService } from './short.service';
import { CreateShortDto } from './dto/create-short.dto';

@Controller('')
export class ShortController {
  constructor(private readonly shortService: ShortService) {}

  @Post()
  create(@Body() createShortDto: CreateShortDto) {
    return this.shortService.create(createShortDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Res() res: any) {
    return this.shortService.findOne(id, res);
  }
}
