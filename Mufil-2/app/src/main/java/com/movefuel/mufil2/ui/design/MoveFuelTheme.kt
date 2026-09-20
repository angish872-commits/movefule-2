package com.movefuel.mufil2.ui.design

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val MoveFuelDarkScheme = darkColorScheme(
    primary = MoveFuelColors.Sage,
    onPrimary = MoveFuelColors.Background,
    secondary = MoveFuelColors.SageSoft,
    background = MoveFuelColors.Background,
    onBackground = MoveFuelColors.Text,
    surface = MoveFuelColors.Surface,
    onSurface = MoveFuelColors.Text,
    surfaceVariant = MoveFuelColors.Surface2,
    outline = MoveFuelColors.Border,
    error = MoveFuelColors.Danger,
    onError = Color.Black,
)

@Composable
fun MoveFuelTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = MoveFuelDarkScheme,
        typography = MoveFuelTypography,
        content = content,
    )
}
