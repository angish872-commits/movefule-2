package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP021YouTubeImportScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_021",
        title = "YouTube Import",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_022,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_020,
        onNavigate = onNavigate,
    ) {
            MFField("YouTube URL","https://youtube.com/…")
            MFNotice("Persistent processing","You can leave this screen while extraction continues.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP021YouTubeImportScreenPreview() {
    MoveFuelTheme { RCP021YouTubeImportScreen {} }
}
