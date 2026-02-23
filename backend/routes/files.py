from fastapi import APIRouter, HTTPException
from models.file import (
    FileReadRequest,
    FileReadResponse,
    FileWriteRequest,
    FileWriteResponse,
    FileTreeRequest,
    FileTreeNode,
    SyntaxCheckRequest,
    SyntaxCheckResponse,
)
from services.file_service import FileService

router = APIRouter(prefix="/api/files", tags=["files"])

# Set from main.py
file_service: FileService | None = None


@router.post("/read", response_model=FileReadResponse)
async def read_file(req: FileReadRequest):
    try:
        content, language = file_service.read_file(req.path)
        return FileReadResponse(content=content, language=language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/write", response_model=FileWriteResponse)
async def write_file(req: FileWriteRequest):
    try:
        file_service.write_file(req.path, req.content)
        return FileWriteResponse(success=True, message="File saved")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tree", response_model=list[FileTreeNode])
async def get_file_tree(req: FileTreeRequest):
    try:
        return file_service.get_file_tree(req.root, req.max_depth)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check_syntax", response_model=SyntaxCheckResponse)
async def check_syntax(req: SyntaxCheckRequest):
    try:
        errors, valid = file_service.check_syntax(req.path, req.content)
        return SyntaxCheckResponse(errors=errors, valid=valid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
