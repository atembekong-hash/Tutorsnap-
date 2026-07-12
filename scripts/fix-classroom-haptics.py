import re

path = '/home/ubuntu/mathgenius-ai/app/(tabs)/classroom.tsx'
with open(path, 'r') as f:
    content = f.read()

old = '''    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        nowBookmarked
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    }'''

new = '    if (nowBookmarked) H.notificationSuccess(); else H.notificationWarning();'

content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)

print('Done')
