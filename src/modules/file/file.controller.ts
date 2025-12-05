import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FileService } from './file.service';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { FileResponseDto, UploadImageDto } from './dto/file.Dto';

import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.admin';
import { Roles, UserRole } from '../../decorator/role.decorator';

@ApiTags('File')
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @ApiBearerAuth()
  @Post('uploadImage/:id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadImageDto })
  @ApiResponse({
    status: 201,
    description: 'Imagen subida exitosamente',
    type: FileResponseDto,
  })
  uploadProductImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo');
    }
    return this.fileService.uploadImage(id, file);
  }
}
