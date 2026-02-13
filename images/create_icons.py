from PIL import Image, ImageDraw, ImageFont
import os

# 아이콘 크기
sizes = [(192, 192), (512, 512)]

# 색상 설정
bg_color = (66, 133, 244)  # 파란색 (#4285f4)
text_color = (255, 255, 255)  # 흰색

for size in sizes:
    # 이미지 생성
    img = Image.new('RGB', size, bg_color)
    draw = ImageDraw.Draw(img)
    
    # 텍스트 크기에 따른 폰트 크기 계산
    font_size = size[0] // 4
    
    try:
        # 시스템 폰트 사용 시도
        font = ImageFont.truetype("malgun.ttf", font_size)  # Windows 맑은 고딕
    except:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    # 텍스트 그리기
    text = "재고"
    
    # 텍스트 중앙 정렬
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2
    
    # 그림자 효과
    shadow_offset = size[0] // 50
    draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=(0, 0, 0, 128))
    
    # 메인 텍스트
    draw.text((x, y), text, font=font, fill=text_color)
    
    # 저장
    filename = f'icon-{size[0]}.png'
    img.save(filename)
    print(f'{filename} 생성 완료!')

print('모든 아이콘이 생성되었습니다.')
