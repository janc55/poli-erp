import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { RegisterDocumentDto } from './dto/document.dto';
import { CurrentUser, AuthUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/auth.decorators';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Get('patient/:patientId')
  @RequirePermissions('patients:read')
  listByPatient(@Param('patientId') patientId: string) {
    return this.service.listByPatient(patientId);
  }

  @Post()
  @RequirePermissions('patients:write')
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDocumentDto) {
    return this.service.register(user.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('patients:write')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
