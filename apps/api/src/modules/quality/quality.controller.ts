import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QualityService } from './quality.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

const storage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@Controller('api/v1/quality')
@UseGuards(JwtAuthGuard)
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('ticketType') ticketType?: string,
  ) {
    return this.qualityService.findAll(user.companyId, {
      search,
      status,
      severity,
      ticketType,
    });
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.qualityService.findOne(user.companyId, id);
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    return this.qualityService.create(user.companyId, user.id, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.qualityService.update(user.companyId, id, dto);
  }

  @Patch(':id/badges')
  async updateBadges(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.qualityService.updateBadges(user.companyId, id, body.badges ?? []);
  }

  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadAttachment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.qualityService.addAttachment(user.companyId, id, {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });
  }

  @Delete(':id/attachments/:attachmentId')
  async removeAttachment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.qualityService.removeAttachment(
      user.companyId,
      id,
      attachmentId,
    );
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.qualityService.remove(user.companyId, id);
  }
}
