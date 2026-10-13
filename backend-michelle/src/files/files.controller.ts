import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { FilesService, MAX_FILE_SIZE, toBuffer, type UploadedFileData } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@Controller('files')
@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @Roles('ADMIN')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir una pauta o archivo (ADMIN)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE + 1 } }))
  upload(
    @UploadedFile() file: UploadedFileData | undefined,
    @Body() body: { name?: string; patientId?: string },
  ) {
    return this.filesService.upload(file, body.name, body.patientId);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar biblioteca de pautas (y archivos de un paciente)' })
  list(@Query('patientId') patientId?: string) {
    return this.filesService.list(patientId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Descargar un archivo propio o compartido en una consulta' })
  async download(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthenticatedUser },
    @Res() response: Response,
  ) {
    const file = await this.filesService.download(id, request.user);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    response.send(toBuffer(file.data));
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar un archivo (ADMIN)' })
  remove(@Param('id') id: string) {
    return this.filesService.remove(id);
  }
}
