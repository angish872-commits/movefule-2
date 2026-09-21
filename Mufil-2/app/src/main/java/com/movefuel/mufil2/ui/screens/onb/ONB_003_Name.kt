package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB003NameScreen(
    onNavigate: (MoveFuelRoute) -> Unit,
    onNameChanged: (String) -> Unit = {},
) {
    MFScreenFrame(
        id = "ONB_003",
        title = "Name",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_002,
        onNavigate = onNavigate,
    ) {
            MFField("Name", "", onValueChange = onNameChanged)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB003NameScreenPreview() {
    MoveFuelTheme { ONB003NameScreen(onNavigate = {}) }
}
